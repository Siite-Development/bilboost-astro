import type { APIRoute } from "astro";
import { fetchHealth } from "../api.ts";
import { getConfig } from "../config.ts";

/**
 * `GET /api/bilboost/health` — the uptime check's way of telling "site down"
 * from "site up, cars unreachable". Never cached: a stale "up" would defeat
 * the point. BilBoost's "Test forbindelse" reads `site_key` and `bilboost`.
 */

export const prerender = false;

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
        published: health.published,
        vehicles: health.vehicle_count,
        token: health.token,
      },
      200,
    );
  } catch (err) {
    return json(
      { ok: false, site: "up", site_key: cfg.siteKey, bilboost: "down", error: err instanceof Error ? err.message : String(err) },
      503,
    );
  }
};

export const GET: APIRoute = () => handleHealth();
