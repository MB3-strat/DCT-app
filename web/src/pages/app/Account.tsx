import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  User, Mail, BadgeCheck, CreditCard, WifiOff, FileWarning,
  Wrench, LogOut, ShieldCheck, FileText, BookOpen, Trash2,
} from "lucide-react";
import { collection, getDocs, doc, deleteDoc, writeBatch, query, where } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { PageContainer, PageHeading } from "@/components/app/PageContainer";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { friendlyAuthError } from "@/lib/authErrors";

export default function Account() {
  const { user, firebaseUser, logout, getIdToken } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const subLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    canceled: "Canceled",
    past_due: "Past due",
    none: "No subscription",
  };

  // Firebase requires a "recent" sign-in (a short window, unrelated to how
  // long the app session has been open) before it will allow a
  // security-sensitive action like deleteUser(). Someone who's been working
  // in the app for a while before deleting their account — e.g. completing
  // CPD feedback first — routinely signs in "too long ago" for Firebase's
  // liking, and would previously hit auth/requires-recent-login only *after*
  // Firestore/KV data had already been wiped, leaving an orphaned Auth
  // account with no data behind. Check freshness up front and reauthenticate
  // before touching anything, so deletion either fully succeeds or doesn't
  // start.
  async function ensureRecentLogin() {
    if (!firebaseUser) return;

    const lastSignInMs = firebaseUser.metadata.lastSignInTime
      ? new Date(firebaseUser.metadata.lastSignInTime).getTime()
      : 0;
    const isStale = Date.now() - lastSignInMs > 5 * 60 * 1000;
    if (!isStale) return;

    const password = window.prompt(
      "For security, please re-enter your password to confirm account deletion:",
    );
    if (!password) {
      throw new Error("Account deletion cancelled — password confirmation is required.");
    }

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email ?? "", password);
      await reauthenticateWithCredential(firebaseUser, credential);
    } catch (error) {
      throw new Error(
        friendlyAuthError(error, "That password wasn't right. Please try deleting your account again."),
      );
    }
  }

  // Full account deletion (GDPR/UK GDPR right to erasure) — not just an app
  // data reset. Order matters: reauthentication (if needed) happens first,
  // before any data is touched; everything that needs the current sign-in
  // session runs next; deleteUser() runs last since it invalidates that
  // session immediately. Every step here is safe to retry (deleting an
  // already-deleted doc/KV key is a no-op), so if this still fails partway
  // for some other reason, the user can retry without side effects.
  async function deleteAccount() {
    if (!user || !firebaseUser || !db) {
      toast.error("Please sign in again before deleting your account.");
      return;
    }

    const confirmed = window.confirm(
      "Permanently delete your account and all your data? This cannot be undone. " +
        "Your profile, bookmarks, progress, feedback and subscription record will all be removed. " +
        "(Issue reports you've submitted are kept for safety auditing, but will no longer be linked to your account.)",
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await ensureRecentLogin();

      const idToken = await getIdToken();
      if (!idToken) throw new Error("Please sign in again before deleting your account.");

      // The one piece of data this app can't reach from the client —
      // the Cloudflare KV subscription/billing record.
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Could not delete your subscription record.");
      }

      // Sever the link from any issue reports back to this account, without
      // deleting the reports themselves (kept as an audit/safety record).
      const issuesSnap = await getDocs(query(collection(db, "reportedIssues"), where("userId", "==", user.id)));
      if (!issuesSnap.empty) {
        const anonymizeBatch = writeBatch(db);
        issuesSnap.docs.forEach((d) => anonymizeBatch.update(d.ref, { userId: null, userName: null, userEmail: null }));
        await anonymizeBatch.commit();
      }

      // Delete bookmarks + progress subcollections, then the profile doc itself.
      const [bookmarksSnap, progressSnap] = await Promise.all([
        getDocs(collection(db, "profiles", user.id, "bookmarks")),
        getDocs(collection(db, "profiles", user.id, "progress")),
      ]);
      const deleteBatch = writeBatch(db);
      bookmarksSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
      progressSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
      await deleteDoc(doc(db, "profiles", user.id));

      // Feedback survey responses are analysed in aggregate, not kept as a
      // per-person record — unlike issue reports, there's no reason to
      // retain them once the account is gone, so this deletes outright
      // rather than anonymising. Deleting a doc that was never created
      // (someone who deletes their account without ever submitting
      // feedback) is a no-op in Firestore, same as the rest of this flow.
      await deleteDoc(doc(db, "feedback", user.id));

      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("dct:")) window.localStorage.removeItem(key);
      }

      // Last step, deliberately — invalidates the session everything above
      // relied on.
      await deleteUser(firebaseUser);

      toast.success("Your account and all your data have been deleted.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(friendlyAuthError(error, "Could not delete your account. Please try again."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeading kicker="Your account" title="Account" description="Manage your profile, subscription and app preferences." />

      {/* Profile */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green font-serif text-2xl font-bold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold">{user.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-semibold text-brand-gold-ink">
                  Email confirmation pending
                </span>
              )}
              {user.roles.map((r) => (
                <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-brand-green" /> Subscription
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {subLabel[user.subscription]}{user.renewsOn ? ` · renews ${user.renewsOn}` : ""}
            </p>
          </div>
          <Link to="/app/billing" className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-mid">
            Manage billing
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <LinkTile to="/app/offline" icon={WifiOff} title="Offline content" desc="Download status & sync" />
        <LinkTile to="/app/sources" icon={BookOpen} title="Sources & review" desc="How content is maintained" />
        <LinkTile to="/app/disclaimer" icon={FileText} title="Disclaimer & intended use" desc="Read before you rely on it" />
        <LinkTile to="/app/report/clinical" icon={FileWarning} title="Report a clinical issue" desc="Flag content for review" />
        <LinkTile to="/app/report/technical" icon={Wrench} title="Report a technical issue" desc="Bugs & problems" />
        {user.roles.includes("admin") && (
          <LinkTile to="/app/admin" icon={ShieldCheck} title="Admin" desc="Content & review management" />
        )}
      </div>

      <button
        onClick={async () => { await logout(); navigate("/"); toast("Signed out."); }}
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
      <button
        onClick={deleteAccount}
        disabled={deleting}
        className="ml-3 mt-8 inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" /> {deleting ? "Deleting account..." : "Delete account"}
      </button>
    </PageContainer>
  );
}

function LinkTile({ to, icon: Icon, title, desc }: { to: string; icon: typeof User; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-brand-green/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="truncate text-sm text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
