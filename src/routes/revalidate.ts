import type { APIRoute } from "astro";
import { getConfig } from "../config.ts";
import type { PushBody } from "../contract.ts";
import { verifySignature, SIGNATURE_HEADER } from "../signature.ts";
import { tagsForPush } from "../tags.ts";

/**
 * `POST /api/bilboost/revalidate` — BilBoost says which cars changed; the
 * Worker purges its own cache tags.
 *
 * The purge is called directly on `cloudflare:workers` rather than through
 * Astro's `cache.invalidate()`, because the adapter's provider (14.3.x)
 * discards the purge result and Cloudflare reports a rate-limited purge as
 * `{ success: false }`, not as an exception. BilBoost needs to see the 429.
 *
 * Answers, and what BilBoost does with them:
 *   200 purged / dry run / cache_disabled   ok
 *   400 / 401 / 409                          config error, no retry
 *   429 rate_limited, 502 purge_failed       retry
 */

export const prerender = false;

/** At most one purge per isolate every 2 s: a leaked secret cannot burn the account's purge budget. */
const MIN_PURGE_GAP_MS = 2_000;
let lastPurgeAt = 0;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

const parseBody = (text: string): PushBody | null => {
  try {
    const b = JSON.parse(text) as Partial<PushBody>;
    if (b.v !== 1 || b.type !== "vehicles.changed" || typeof b.site_key !== "string") return null;
    if (b.scope !== "cars" && b.scope !== "all") return null;
    if (!Array.isArray(b.vehicle_ids) || !b.vehicle_ids.every((id) => typeof id === "string")) return null;
    return b as PushBody;
  } catch {
    return null;
  }
};

type Purger = (tags: string[]) => Promise<{ success: boolean; errors: { message: string }[] }>;

const cloudflarePurge: Purger = async (tags) => {
  const { cache } = await import("cloudflare:workers");
  return await cache.purge({ tags });
};

export const handleRevalidate = async (
  request: Request,
  deps: { purge?: Purger; now?: () => number } = {},
): Promise<Response> => {
  const cfg = await getConfig();
  const text = await request.text();

  if (cfg.webhookSecrets.length === 0) return json({ error: "no_secret" }, 401);
  const verified = await verifySignature(cfg.webhookSecrets, text, request.headers.get(SIGNATURE_HEADER));
  if (!verified.ok) return json({ error: verified.reason }, 401);

  const body = parseBody(text);
  if (!body) return json({ error: "bad_body" }, 400);
  if (body.site_key !== cfg.siteKey) return json({ error: "site_key_mismatch", site_key: cfg.siteKey }, 409);

  const secret = verified.secretIndex === 0 ? "current" : "next";
  if (body.dry_run) return json({ ok: true, dry_run: true, secret }, 200);

  const now = deps.now?.() ?? Date.now();
  if (now - lastPurgeAt < MIN_PURGE_GAP_MS) {
    return json({ error: "purge_throttled" }, 503, { "Retry-After": "5" });
  }
  lastPurgeAt = now;

  const tags = tagsForPush(cfg.siteKey, body.scope, body.vehicle_ids);
  let result: { success: boolean; errors: { message: string }[] };
  try {
    result = await (deps.purge ?? cloudflarePurge)(tags);
  } catch (err) {
    // No `cloudflare:workers` (local dev, tests): nothing is cached either.
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: true, purged: false, reason: "cache_disabled", detail: message }, 200);
  }

  if (result.success) return json({ ok: true, purged: true, tags: tags.length, seq: body.seq }, 200);
  const messages = result.errors.map((e) => e.message).join("; ");
  if (/rate|limit|429/i.test(messages)) return json({ error: "rate_limited", detail: messages }, 429, { "Retry-After": "60" });
  return json({ error: "purge_failed", detail: messages }, 502);
};

export const POST: APIRoute = ({ request }) => handleRevalidate(request);

/** Test seam. */
export const __resetPurgeGap = (): void => {
  lastPurgeAt = 0;
};
