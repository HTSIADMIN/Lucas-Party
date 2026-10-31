import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "lp_session";

/** The raw token only ever lives in the user's cookie; the DB keeps its SHA-256. */
export function newSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
