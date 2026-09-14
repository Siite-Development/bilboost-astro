import { defineMiddleware } from "astro:middleware";
import { getConfig } from "./config.ts";
import { canonicalQuery, CRITERIA_KEYS, parseCriteria } from "./criteria.ts";
import { isDevsiteHost } from "./options.ts";

/**
 * Two jobs, both only under `basePath`:
 *
 * 1. Devsite hosts get `X-Robots-Tag: noindex, nofollow`. A `_headers` file
 *    only covers static assets, and the cache key has no hostname in it, so
 *    this header is added per response and those responses are never cached
 *    (`applyCache` opts them out).
 * 2. The list route redirects to its canonical query string when the known
 *    filter parameters are out of order or carry defaults, so every variant
 *    of a filter is cached once. Unknown parameters (`utm_*`, `gclid`) are
 *    left alone — they are not ours to rewrite.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search, hostname } = context.url;
  let cfg;
  try {
    cfg = await getConfig();
  } catch {
    return next();
  }
  const underBase = pathname === cfg.basePath || pathname.startsWith(`${cfg.basePath}/`);
  if (!underBase) return next();

  const isList = pathname === `${cfg.basePath}/` || pathname === cfg.basePath;
  if (isList && context.request.method === "GET" && search) {
    const params = new URLSearchParams(search);
    const ours = new URLSearchParams();
    const others = new URLSearchParams();
    for (const [key, value] of params) {
      if ((CRITERIA_KEYS as readonly string[]).includes(key)) ours.set(key, value);
      else others.append(key, value);
    }
    const canonical = canonicalQuery(parseCriteria(ours));
    const oursNow = ours.toString() ? `?${ours.toString()}` : "";
    if (canonical !== oursNow) {
      const merged = new URLSearchParams(canonical);
      for (const [k, v] of others) merged.append(k, v);
      const q = merged.toString();
      return context.redirect(`${cfg.basePath}/${q ? `?${q}` : ""}`, 301);
    }
  }

  const response = await next();
  if (isDevsiteHost(hostname, cfg)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
});
