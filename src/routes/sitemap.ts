import type { APIRoute } from "astro";
import { fetchVehicleList } from "../api.ts";
import { applyCache } from "../cache.ts";
import { getConfig } from "../config.ts";
import { canonicalPath, listPath } from "../slug.ts";
import { tagsFor } from "../tags.ts";

/**
 * `GET /sitemap-biler.xml` — the server-rendered car pages are invisible to
 * the static sitemap, so this one lists them. Register it in the site's
 * sitemap config: `sitemap({ customSitemaps: [SITE.url + "/sitemap-biler.xml"] })`.
 */

export const prerender = false;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async (context) => {
  const cfg = await getConfig();
  try {
    const list = await fetchVehicleList({ apiBase: cfg.apiBase, siteKey: cfg.siteKey, readToken: cfg.readToken });
    const t = tagsFor(cfg.siteKey);
    applyCache(context, "sitemap", cfg, { tags: [t.all, t.list] });

    const urls = [
      `<url><loc>${esc(cfg.siteUrl + listPath(cfg.basePath))}</loc></url>`,
      ...list.vehicles.map(
        (v) =>
          `<url><loc>${esc(cfg.siteUrl + canonicalPath(cfg.basePath, v))}</loc><lastmod>${new Date(v.updated_at).toISOString()}</lastmod></url>`,
      ),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } });
  } catch {
    if (context.cache.enabled) context.cache.set(false);
    return new Response("", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
};
