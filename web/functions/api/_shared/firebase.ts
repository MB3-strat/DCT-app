import { createRemoteJWKSet, jwtVerify } from "jose";

// Firebase ID tokens are RS256-signed by Google; this is the public JWKS
// for verifying them — no service-account credential needed, pure
// signature verification.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com"),
);

export interface VerifiedUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export async function verifyIdToken(request: Request, projectId: string): Promise<VerifiedUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (typeof payload.sub !== "string") return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch (error) {
    // TEMPORARY: surface the real reason in `wrangler pages deployment tail`
    // instead of a bare 401 everywhere. Safe to log — this is jose's error
    // name/message (e.g. "JWTClaimValidationFailed: unexpected \"iss\"
    // claim"), never the token itself. Remove once verification is working.
    console.error("verifyIdToken failed:", error instanceof Error ? `${error.name}: ${error.message}` : error);
    return null;
  }
}
