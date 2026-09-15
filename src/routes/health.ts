import type { APIRoute } from "astro";
import { fetchHealth } from "../api.ts";
import { getConfig } from "../config.ts";

/**
 * `GET /api/bilboost/health` — the uptime check's way of telling "site down"
 * from "site up, cars unreachable". Never cached: a stale "up" would defeat
 * the point. BilBoost's "Test forbindelse" reads `site_key`, `bilboost` and
 * `turnstile` (0.1.7): whether the site's Turnstile site key is a real one,
 * Cloudflare's test key (the widget then says "Kun til test"), or missing.
 */

export const prerender = false;

/** Cloudflare's published test site keys: always pass, always block, invisible, interactive. */
const TEST_SITE_KEY = /^[123]x0{20}[A-F]{2}$/;

export const turnstileState = (siteKey: string | null | undefined): "set" | "test" | "missing" =>
  !siteKey ? "missing" : TEST_SITE_KEY.test(siteKey) ? "test" : "set";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const handleHealth = async (): Promise<Response> => {
  const cfg = await getConfig();
  try {
    const health = await fetchHealth({ apiBase: cfg.apiBase, siteKey: cfg.siteKey, readToken: cfg.readToken });
    return json(
      {
        ok: true,
        site: "up",
        site_key: cfg.siteKey,
        bilboost: "up",
        turnstile: turnstileState(cfg.turnstileSiteKey),
        published: health.published,
        vehicles: health.vehicle_count,
        token: health.token,
      },
      200,
    );
  } catch (err) {
    return json(
      { ok: false, site: "up", site_key: cfg.siteKey, bilboost: "down", turnstile: turnstileState(cfg.turnstileSiteKey), error: err instanceof Error ? err.message : String(err) },
      503,
    );
  }
};

export const GET: APIRoute = () => handleHealth();
