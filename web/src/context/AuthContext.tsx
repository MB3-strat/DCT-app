import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { toast } from "sonner";
import { auth, db, getRedirectUrl } from "@/lib/firebase";

/**
 * Firebase-backed auth. Subscription/certificate state lives in Cloudflare
 * KV (not Firestore) and is fetched from /api/subscription-status, since
 * it's written exclusively by the Stripe webhook. The client never marks a
 * payment successful itself.
 */

export type Role = "subscriber" | "editor" | "clinical-reviewer" | "clinical-owner" | "admin";

export type SubscriptionStatus = "none" | "trialing" | "active" | "canceled" | "past_due";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  roles: Role[];
  subscription: SubscriptionStatus;
  renewsOn?: string;
  stripeCustomerId?: string;
  certificatePurchased: boolean;
  certificatePaidAt?: string;
}

interface AuthValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthed: boolean;
  isSubscribed: boolean;
  isAdmin: boolean;
  // Whether a post-checkout confirmation poll is currently running — lives
  // here (not on the Billing/FeedbackCpd pages) specifically so it survives
  // navigation. See confirmSubscriptionAfterCheckout for why that matters.
  confirmingSubscription: boolean;
  confirmingCertificate: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  getIdToken: () => Promise<string | null>;
  // Call after a Stripe Checkout redirect lands with ?checkout=success /
  // ?certificate=success. Starts a background poll (living here in
  // AuthProvider, which wraps the whole app and never unmounts) that keeps
  // re-checking subscription/certificate status until it resolves or times
  // out — up to ~60s, since Cloudflare KV is eventually consistent and the
  // webhook's write can take a while to become visible to a read. Because
  // this lives above the router, the "buy" buttons on Billing/FeedbackCpd
  // stay correctly disabled even if the user navigates away and back (or
  // uses browser back/forward) mid-confirmation — clicking "Subscribe" or
  // "Pay €5" again while a real payment is still confirming would create a
  // genuine second charge, not just a UI glitch.
  confirmSubscriptionAfterCheckout: () => void;
  confirmCertificateAfterCheckout: () => void;
  // Re-sends the verification link Firebase sent at registration. Nothing
  // in the app currently blocks on emailVerified (see EmailVerificationBanner
  // for the nag-only reminder that uses this) — this just lets a user who
  // missed/lost the original email get a fresh one without re-registering.
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const premiumTestEmail = import.meta.env.VITE_PREMIUM_TEST_EMAIL?.trim().toLowerCase();
const clientSessionKey = "dct:client-session-id";
const emailForSignInKey = "dct:email-for-sign-in";

function getClientSessionId() {
  const existing = window.localStorage.getItem(clientSessionKey);
  if (existing) return existing;

  const next =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(clientSessionKey, next);
  return next;
}

interface SubscriptionInfo {
  subscription: SubscriptionStatus;
  renewsOn?: string;
  stripeCustomerId?: string;
  certificatePurchased: boolean;
  certificatePaidAt?: string;
}

async function fetchSubscriptionStatus(idToken: string): Promise<SubscriptionInfo> {
  try {
    const response = await fetch("/api/subscription-status", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) throw new Error("subscription-status request failed");
    const data = await response.json();
    return {
      subscription: (data.subscriptionStatus as SubscriptionStatus) ?? "none",
      renewsOn: data.subscriptionCurrentPeriodEnd?.slice(0, 10),
      stripeCustomerId: data.stripeCustomerId ?? undefined,
      certificatePurchased: data.certificatePaymentStatus === "paid",
      certificatePaidAt: data.certificatePaidAt?.slice(0, 10),
    };
  } catch {
    return { subscription: "none", certificatePurchased: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (fbUser: FirebaseUser | null): Promise<User | null> => {
    setFirebaseUser(fbUser);

    if (!fbUser || !db) {
      setUser(null);
      setLoading(false);
      return null;
    }

    const profileRef = doc(db, "profiles", fbUser.uid);
    let profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        email: fbUser.email ?? "",
        fullName: fbUser.displayName ?? "",
        roles: [],
        trustSettings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      profileSnap = await getDoc(profileRef);
    }

    const profile = profileSnap.data() ?? {};
    const idToken = await fbUser.getIdToken();
    const subInfo = await fetchSubscriptionStatus(idToken);

    const email = fbUser.email ?? "";
    const isPremiumTestUser = Boolean(premiumTestEmail && email.toLowerCase() === premiumTestEmail);
    const subscription = isPremiumTestUser ? "active" : subInfo.subscription;
    const roles = Array.from(
      new Set([
        ...((profile.roles as Role[] | undefined) ?? []),
        ...(isPremiumTestUser ? (["subscriber"] as Role[]) : []),
      ]),
    );

    const nextUser: User = {
      id: fbUser.uid,
      name: profile.fullName || fbUser.displayName || email.split("@")[0] || "",
      email,
      emailVerified: fbUser.emailVerified,
      roles,
      subscription,
      renewsOn: subInfo.renewsOn,
      stripeCustomerId: subInfo.stripeCustomerId,
      certificatePurchased: subInfo.certificatePurchased,
      certificatePaidAt: subInfo.certificatePaidAt,
    };
    setUser(nextUser);
    setLoading(false);

    // Claim this tab as the active session (direct client write — this is
    // the user's own document and doesn't need server privilege).
    await setDoc(
      profileRef,
      { activeSessionId: getClientSessionId(), activeSessionAt: serverTimestamp() },
      { merge: true },
    ).catch(() => {});

    return nextUser;
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem(emailForSignInKey);
      if (!email) {
        email = window.prompt("Confirm your email to finish signing in") ?? "";
      }
      if (email) {
        void signInWithEmailLink(auth, email, window.location.href).then(() => {
          window.localStorage.removeItem(emailForSignInKey);
          window.history.replaceState(null, "", window.location.pathname);
        });
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      void loadUser(fbUser);
    });

    return () => unsubscribe();
  }, [loadUser]);

  // Real-time single-active-session enforcement: if another device claims
  // this profile's activeSessionId, sign this tab out immediately.
  useEffect(() => {
    if (!db || !user) return;

    const profileRef = doc(db, "profiles", user.id);
    const unsubscribe: Unsubscribe = onSnapshot(profileRef, (snap) => {
      const activeSessionId = snap.data()?.activeSessionId as string | undefined;
      if (activeSessionId && activeSessionId !== getClientSessionId()) {
        void auth?.signOut();
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error("Firebase is not configured.");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await loadUser(cred.user);
    },
    [loadUser],
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    await sendEmailVerification(cred.user, {
      url: getRedirectUrl("/app"),
      handleCodeInApp: true,
    });
    // Returned so the signup flow can send the user straight to Stripe
    // checkout without waiting for onAuthStateChanged to settle.
    return cred.user.getIdToken();
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!firebaseUser) throw new Error("Please sign in again before resending the verification email.");
    await sendEmailVerification(firebaseUser, {
      url: getRedirectUrl("/app"),
      handleCodeInApp: true,
    });
  }, [firebaseUser]);

  const sendMagicLink = useCallback(async (email: string) => {
    if (!auth) throw new Error("Firebase is not configured.");
    await sendSignInLinkToEmail(auth, email, {
      url: getRedirectUrl("/app"),
      handleCodeInApp: true,
    });
    window.localStorage.setItem(emailForSignInKey, email);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;

    if (db && firebaseUser) {
      const profileRef = doc(db, "profiles", firebaseUser.uid);
      const snap = await getDoc(profileRef).catch(() => null);
      if (snap?.data()?.activeSessionId === getClientSessionId()) {
        await setDoc(profileRef, { activeSessionId: null, activeSessionAt: null }, { merge: true }).catch(
          () => {},
        );
      }
    }

    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  }, [firebaseUser]);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const getIdToken = useCallback(async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  // A stable reference (only changes when firebaseUser itself changes, not
  // on every state update loadUser triggers) — consumers that depend on
  // this in a useEffect array would otherwise re-run on every render.
  const refreshUser = useCallback(() => loadUser(firebaseUser), [loadUser, firebaseUser]);

  // See the AuthValue interface for why this lives here rather than on the
  // Billing/FeedbackCpd pages: it needs to survive navigation.
  const [confirmingKind, setConfirmingKind] = useState<"subscription" | "certificate" | null>(null);
  const CONFIRM_POLL_INTERVAL_MS = 2000;
  // Cloudflare KV is eventually consistent — a write from the webhook can
  // take up to roughly a minute to become visible to a read from here, even
  // though the write itself already completed. 30 attempts at 2s covers
  // that with room to spare.
  const CONFIRM_MAX_ATTEMPTS = 30;

  const confirmSubscriptionAfterCheckout = useCallback(() => setConfirmingKind("subscription"), []);
  const confirmCertificateAfterCheckout = useCallback(() => setConfirmingKind("certificate"), []);

  useEffect(() => {
    if (!confirmingKind) return;

    const isConfirmed = (candidate: User | null) => {
      if (!candidate) return false;
      return confirmingKind === "subscription"
        ? candidate.subscription === "active" || candidate.subscription === "trialing"
        : candidate.certificatePurchased;
    };

    const successMessage =
      confirmingKind === "subscription" ? "You're subscribed — welcome in." : "Certificate unlocked — you can download it now.";

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number;

    const poll = async () => {
      attempts += 1;
      const next = await loadUser(firebaseUser);
      if (cancelled) return;
      if (isConfirmed(next)) {
        setConfirmingKind(null);
        toast.success(successMessage);
        return;
      }
      if (attempts >= CONFIRM_MAX_ATTEMPTS) {
        setConfirmingKind(null);
        return;
      }
      timeoutId = window.setTimeout(poll, CONFIRM_POLL_INTERVAL_MS);
    };

    timeoutId = window.setTimeout(poll, CONFIRM_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [confirmingKind, firebaseUser, loadUser]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      isAuthed: !!user,
      isSubscribed: !!user && (user.subscription === "active" || user.subscription === "trialing"),
      isAdmin: !!user && user.roles.includes("admin"),
      confirmingSubscription: confirmingKind === "subscription",
      confirmingCertificate: confirmingKind === "certificate",
      login,
      register,
      sendMagicLink,
      logout,
      refreshUser,
      updateUser,
      getIdToken,
      confirmSubscriptionAfterCheckout,
      confirmCertificateAfterCheckout,
      resendVerificationEmail,
    }),
    [
      user,
      firebaseUser,
      loading,
      confirmingKind,
      login,
      register,
      sendMagicLink,
      logout,
      refreshUser,
      updateUser,
      getIdToken,
      confirmSubscriptionAfterCheckout,
      confirmCertificateAfterCheckout,
      resendVerificationEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
