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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<string>;
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  getIdToken: () => Promise<string | null>;
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

  const loadUser = useCallback(async (fbUser: FirebaseUser | null) => {
    setFirebaseUser(fbUser);

    if (!fbUser || !db) {
      setUser(null);
      setLoading(false);
      return;
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

    setUser({
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
    });
    setLoading(false);

    // Claim this tab as the active session (direct client write — this is
    // the user's own document and doesn't need server privilege).
    await setDoc(
      profileRef,
      { activeSessionId: getClientSessionId(), activeSessionAt: serverTimestamp() },
      { merge: true },
    ).catch(() => {});
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

  const value = useMemo<AuthValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      isAuthed: !!user,
      isSubscribed: !!user && (user.subscription === "active" || user.subscription === "trialing"),
      isAdmin: !!user && user.roles.includes("admin"),
      login,
      register,
      sendMagicLink,
      logout,
      refreshUser,
      updateUser,
      getIdToken,
    }),
    [user, firebaseUser, loading, login, register, sendMagicLink, logout, refreshUser, updateUser, getIdToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
