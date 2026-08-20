import { FirebaseError } from "firebase/app";

// Firebase Auth error codes we actually see in this app's flows (email/
// password sign-up, sign-in, magic link, password reset, account deletion),
// mapped to messages a non-technical user can act on. Anything not listed
// here falls back to a generic message rather than surfacing Firebase's raw
// "Firebase: Error (auth/xyz)." text.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Firebase intentionally merges wrong-password and user-not-found into a
  // single code so a failed login can't be used to enumerate accounts —
  // keep that same ambiguity in the message shown to the user.
  "auth/invalid-credential": "That email or password isn't right. Double-check and try again.",
  "auth/wrong-password": "That email or password isn't right. Double-check and try again.",
  "auth/user-not-found": "That email or password isn't right. Double-check and try again.",

  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/missing-email": "Please enter your email address.",
  "auth/user-disabled": "This account has been disabled. Contact support if you think this is a mistake.",
  "auth/email-already-in-use": "An account already exists with that email — try signing in instead.",
  "auth/weak-password": "Choose a stronger password (at least 6 characters).",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
  "auth/requires-recent-login": "For security, please sign out, sign back in, and try again right away.",
  "auth/expired-action-code": "This link has expired — please request a new one.",
  "auth/invalid-action-code": "This link is invalid or has already been used.",
  "auth/unauthorized-continue-uri": "Something's misconfigured on our end — this isn't something you can fix from here. Please contact support.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
};

const GENERIC_FALLBACK = "Something went wrong. Please try again — if it keeps happening, contact support.";

// Turns a caught error from an auth-related action into a message safe and
// useful to show a user. Firebase SDK errors get mapped to plain language;
// errors we threw ourselves (e.g. "Please sign in again before deleting
// your account.") are already written to be user-readable, so those pass
// through unchanged rather than being forced through the Firebase map.
export function friendlyAuthError(error: unknown, fallback: string = GENERIC_FALLBACK): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
