/**
 * bilboost-astro — BilBoost cars on a dealer's Astro site.
 *
 * Behaviour lives here; the site owns the look. See README.md and HOOKS.md.
 */
// The integration is build-time only (node:fs, node:module) and lives at
// "bilboost-astro/integration"; re-exporting it here would drag Node modules
// into the Worker bundle of every page that imports `getConfig`.
export type { BilboostOptions } from "./options.ts";
export { bilboostLoader, BilboostError, getLastDealer } from "./loader.ts";
export { applyCache, markUnavailable, CACHE_PROFILES, type CacheProfile } from "./cache.ts";
export { getConfig, type RuntimeConfig } from "./config.ts";
export * from "./contract.ts";
export * from "./criteria.ts";
export * from "./format.ts";
export * from "./slug.ts";
export * from "./tags.ts";
export * from "./jsonld.ts";
export * from "./images.ts";
export { LABELS, mergeLabels, t, type Labels } from "./labels.da.ts";
export { resolveOptions, isDevsiteHost, type ResolvedOptions } from "./options.ts";
