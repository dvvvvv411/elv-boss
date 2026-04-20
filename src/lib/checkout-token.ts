// HMAC-SHA256 signed checkout tokens. Format: base64url(payload).base64url(signature)
// Signing key is SUPABASE_SERVICE_ROLE_KEY (server-only).

export type CheckoutTokenProduct = {
  name: string;
  price: number;
  quantity: number;
  sku?: string | null;
};

export type CheckoutTokenPayload = {
  branding_id: string;
  products: CheckoutTokenProduct[];
  shipping_cost: number;
  total_amount: number;
  exp: number; // Unix ms
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(): Promise<CryptoKey> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for token signing");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

export async function signToken(payload: CheckoutTokenPayload): Promise<string> {
  const key = await importKey();
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, toArrayBuffer(payloadBytes)),
  );
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

export type VerifyResult =
  | { ok: true; payload: CheckoutTokenPayload }
  | { ok: false; reason: "invalid" | "expired" };

export async function verifyToken(token: string): Promise<VerifyResult> {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "invalid" };
  }
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return { ok: false, reason: "invalid" };

  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    payloadBytes = b64urlDecode(payloadPart);
    sigBytes = b64urlDecode(sigPart);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const key = await importKey();
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, toArrayBuffer(payloadBytes)),
  );
  if (!timingSafeEqual(expected, sigBytes)) return { ok: false, reason: "invalid" };

  let payload: CheckoutTokenPayload;
  try {
    payload = JSON.parse(dec.decode(payloadBytes));
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (
    !payload ||
    typeof payload.branding_id !== "string" ||
    !Array.isArray(payload.products) ||
    typeof payload.shipping_cost !== "number" ||
    typeof payload.total_amount !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() > payload.exp) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}
