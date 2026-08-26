// Minimal signed-cookie session — no auth library dependency needed for a
// single admin role. Uses Web Crypto (crypto.subtle) rather than Node's
// `crypto` module so this works identically in Next.js Middleware (Edge
// runtime) and in API routes (Node runtime).
//
// Phase 4 note: this whole file gets replaced by Supabase Auth. Nothing
// that imports SESSION_COOKIE_NAME or calls these two functions should need
// to change when that happens — only this file's internals do.

export const SESSION_COOKIE_NAME = "admin_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${expires}`;
  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toHex(signature)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expiresStr, signatureHex] = parts;
  if (role !== "admin") return false;

  const expires = Number(expiresStr);
  if (Number.isNaN(expires) || Date.now() > expires) return false;

  const key = await getKey();
  const expectedSig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${role}.${expiresStr}`)
  );
  return toHex(expectedSig) === signatureHex;
}
