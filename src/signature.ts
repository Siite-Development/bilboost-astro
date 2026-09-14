/**
 * Verification of BilBoost's push signature. Same algorithm as
 * `convex/lib/siteSignature.ts`; both run `fixtures/signature-vectors.json`.
 *
 *   BilBoost-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "${t}.${body}")>
 */

export const SIGNATURE_HEADER = "BilBoost-Signature";
export const TOLERANCE_SECONDS = 5 * 60;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export const hmacSha256Hex = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(mac));
};

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const signBody = async (secret: string, body: string, t: number): Promise<string> =>
  `t=${t},v1=${await hmacSha256Hex(secret, `${t}.${body}`)}`;

export const parseSignatureHeader = (header: string | null): { t: number; v1: string } | null => {
  if (!header) return null;
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const [k, val] = part.trim().split("=");
    if (k === "t" && val) t = Number(val);
    if (k === "v1" && val) v1 = val;
  }
  if (t === null || !Number.isFinite(t) || !v1) return null;
  return { t, v1 };
};

export type VerifyResult =
  | { ok: true; secretIndex: number }
  | { ok: false; reason: "bad_signature" | "stale_timestamp" };

export const verifySignature = async (
  secrets: string[],
  body: string,
  header: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> => {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, reason: "bad_signature" };
  if (Math.abs(nowSeconds - parsed.t) > TOLERANCE_SECONDS) return { ok: false, reason: "stale_timestamp" };
  for (let i = 0; i < secrets.length; i += 1) {
    const secret = secrets[i];
    if (!secret) continue;
    const expected = await hmacSha256Hex(secret, `${parsed.t}.${body}`);
    if (timingSafeEqual(parsed.v1, expected)) return { ok: true, secretIndex: i };
  }
  return { ok: false, reason: "bad_signature" };
};
