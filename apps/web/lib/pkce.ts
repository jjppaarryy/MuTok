import { randomBytes, createHash } from "crypto";

// TikTok allows [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateCodeVerifier(): string {
  // Generate a 64-character random string
  const bytes = randomBytes(64);
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

export function generateCodeChallenge(verifier: string): string {
  // TikTok uses HEX encoding of SHA256, NOT base64url like standard PKCE!
  // See: https://developers.tiktok.com/doc/login-kit-desktop/
  return createHash("sha256")
    .update(verifier)
    .digest("hex");
}
