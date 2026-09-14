import { isDevsiteHost, type ResolvedOptions } from "./options.ts";

/**
 * Cache profiles for the car routes, applied through Astro's route caching
 * (`Astro.cache.set`) so the Cloudflare adapter turns them into
 * `Cloudflare-CDN-Cache-Control` + `Cache-Tag`.
 *
 * `maxAge` is the safety net: if a push from BilBoost is lost, a page is
 * stale for at most five minutes. `swr` keeps responses instant while a
 * refresh runs in the background. Neither `s-maxage` nor `must-revalidate`
 * is ever set — either would switch off Cloudflare's stale-if-error, which
 * is what keeps the site up when BilBoost is unreachable.
 */

export const CACHE_PROFILES = {
  list: { maxAge: 300, swr: 900 },
  detail: { maxAge: 300, swr: 900 },
  gone: { maxAge: 300 },
  sitemap: { maxAge: 3600, swr: 86_400 },
} as const;

export type CacheProfile = keyof typeof CACHE_PROFILES;

export type CacheHint = { tags?: string[]; lastModified?: Date };

/** The subset of `Astro.cache` / `context.cache` this package touches. */
export type CacheLike = {
  enabled: boolean;
  set(options: { maxAge?: number; swr?: number; tags?: string[]; lastModified?: Date } | false): void;
};

export type CacheContext = {
  cache: CacheLike;
  url: URL;
  response?: { headers: Headers; status: number; statusText?: string };
};

/**
 * Cache this response — unless it is being served on a devsite host, where a
 * cached response would be shared with the production hostname (Workers
 * Cache keys on path, not host).
 *
 * Call it ONCE per response, last. Astro merges repeated `cache.set()` calls,
 * so a later `set({ tags })` after a `set(false)` switches caching back on
 * with no max-age; pass extra tags here instead.
 */
export const applyCache = (
  ctx: CacheContext,
  profile: CacheProfile,
  opts: Pick<ResolvedOptions, "devsiteHosts" | "cacheOnDevsite">,
  hint?: CacheHint,
  extraTags: string[] = [],
): void => {
  if (!ctx.cache.enabled) return;
  if (isDevsiteHost(ctx.url.hostname, opts) && !opts.cacheOnDevsite) {
    ctx.cache.set(false);
    return;
  }
  const tags = Array.from(new Set([...(hint?.tags ?? []), ...extraTags]));
  ctx.cache.set({
    ...CACHE_PROFILES[profile],
    ...(hint?.lastModified ? { lastModified: hint.lastModified } : {}),
    ...(tags.length ? { tags } : {}),
  });
};

/** BilBoost could not be reached and there is nothing cached: a 503 that is never stored. */
export const markUnavailable = (ctx: CacheContext): void => {
  if (ctx.cache.enabled) ctx.cache.set(false);
  if (ctx.response) {
    ctx.response.status = 503;
    ctx.response.statusText = "Service Unavailable";
    ctx.response.headers.set("Cache-Control", "no-store");
    ctx.response.headers.set("Retry-After", "60");
  }
};
