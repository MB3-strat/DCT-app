import { getBearerToken, verifyIdToken } from "./_shared/firebase.js";
import { getDoc, listDocs } from "./_shared/firestore.js";
import { type Env, type SubscriptionRecord } from "./_shared/stripe.js";
import MODULES from "../../src/data/modules.json";

export interface AdminUserRow {
  uid: string;
  name: string;
  email: string;
  roles: string[];
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
  cpdPurchased: boolean;
  cpdPurchasedAt?: string;
  renewalReminderSentAt?: string;
  modulesCompleted: number;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  totalModules: number;
  totals: {
    totalUsers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    cpdPurchased: number;
    reminderSent: number;
  };
}

// Same filter stripe-certificate-checkout.ts uses to decide CPD eligibility
// — the `progress` subcollection holds both module and toolkit read state,
// so this narrows to modules that are actually marked read.
async function getModulesCompletedCount(projectId: string, idToken: string, uid: string): Promise<number> {
  try {
    const progressDocs = await listDocs(projectId, idToken, `profiles/${uid}/progress`);
    return progressDocs.filter((d) => d.kind === "module" && d.read === true).length;
  } catch {
    // A user who's never opened a module has no progress subcollection at
    // all yet — treat that (or any other read hiccup for one user) as zero
    // rather than failing the whole admin page over it.
    return 0;
  }
}

// Cloudflare KV has no query/join capability, so this walks every key in the
// subscriptions namespace via the Function's own direct binding (no
// Firestore rules involved — access to this whole endpoint is already
// gated by the isAdmin check below). Fine at this app's scale; would need a
// different approach (e.g. mirroring summary fields onto the Firestore
// profile at webhook time) if the user base grows into the tens of
// thousands and this sweep gets slow.
async function getAllSubscriptionRecords(kv: KVNamespace): Promise<Record<string, SubscriptionRecord>> {
  const records: Record<string, SubscriptionRecord> = {};
  let cursor: string | undefined;

  for (;;) {
    const list = await kv.list({ cursor, limit: 1000 });
    const entries = await Promise.all(
      list.keys.map(async (key) => {
        const raw = await kv.get(key.name);
        return [key.name, raw ? (JSON.parse(raw) as SubscriptionRecord) : {}] as const;
      }),
    );
    for (const [uid, record] of entries) records[uid] = record;

    if (list.list_complete) break;
    cursor = list.cursor;
  }

  return records;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const caller = await verifyIdToken(request, env.FIREBASE_PROJECT_ID);
  if (!caller) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const idToken = getBearerToken(request)!;

  try {
    // Confirm the caller is an admin by reading their OWN profile doc first —
    // same Firestore rules path every other read in this app goes through.
    // A non-admin's own-doc read succeeds (everyone can read their own
    // profile) but is rejected here before any other user's data is touched.
    const callerProfile = await getDoc(env.FIREBASE_PROJECT_ID, idToken, `profiles/${caller.uid}`);
    const callerRoles = (callerProfile?.roles as string[] | undefined) ?? [];
    if (!callerRoles.includes("admin")) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const [profiles, subscriptionsByUid] = await Promise.all([
      listDocs(env.FIREBASE_PROJECT_ID, idToken, "profiles"),
      getAllSubscriptionRecords(env.SUBSCRIPTIONS),
    ]);

    // One extra Firestore read per user (their own progress subcollection).
    // Fine at this app's scale, run in parallel; would need a different
    // approach (e.g. mirroring a count onto the profile doc as progress is
    // saved) if the user base grows large enough for this sweep to get slow.
    const modulesCompletedByUid = Object.fromEntries(
      await Promise.all(
        profiles.map(async (profile) => {
          const uid = profile.id as string;
          return [uid, await getModulesCompletedCount(env.FIREBASE_PROJECT_ID, idToken, uid)] as const;
        }),
      ),
    );

    const users: AdminUserRow[] = profiles.map((profile) => {
      const uid = profile.id as string;
      const record = subscriptionsByUid[uid] ?? {};
      return {
        uid,
        name: (profile.fullName as string) || "",
        email: (profile.email as string) || "",
        roles: (profile.roles as string[] | undefined) ?? [],
        subscriptionStatus: record.subscriptionStatus ?? "none",
        subscriptionExpiresAt: record.subscriptionCurrentPeriodEnd,
        cpdPurchased: record.certificatePaymentStatus === "paid",
        cpdPurchasedAt: record.certificatePaidAt,
        renewalReminderSentAt: record.renewalReminderSentAt,
        modulesCompleted: modulesCompletedByUid[uid] ?? 0,
      };
    });

    const now = Date.now();
    const totals = {
      totalUsers: users.length,
      activeSubscriptions: users.filter(
        (u) => u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing",
      ).length,
      expiredSubscriptions: users.filter(
        (u) =>
          u.subscriptionStatus === "canceled" ||
          u.subscriptionStatus === "past_due" ||
          (u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).getTime() < now : false),
      ).length,
      cpdPurchased: users.filter((u) => u.cpdPurchased).length,
      reminderSent: users.filter((u) => u.renewalReminderSentAt).length,
    };

    return Response.json({ users, totalModules: MODULES.length, totals } satisfies AdminUsersResponse);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load admin user data" },
      { status: 500 },
    );
  }
};
