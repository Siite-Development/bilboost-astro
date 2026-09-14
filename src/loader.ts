import type { LiveLoader } from "astro/loaders";
import { BilboostError, fetchVehicle, fetchVehicleList, type ApiClient } from "./api.ts";
import { getConfig } from "./config.ts";
import type { PublicDealer, PublicVehicle } from "./contract.ts";
import { tagsFor } from "./tags.ts";

/**
 * Astro live loader over BilBoost's read API.
 *
 *   // src/live.config.ts
 *   import { defineLiveCollection } from "astro:content";
 *   import { bilboostLoader } from "bilboost-astro/loader";
 *   export const collections = { biler: defineLiveCollection({ loader: bilboostLoader() }) };
 *
 * Entries are keyed by BB id (`BB-12`), because that is what a push names.
 * Every result carries a `cacheHint` with the tags the site's cache is
 * purged by; pages pass it to `applyCache`.
 */

export type BilboostEntry = PublicVehicle;
export type EntryFilter = { id: string };

/** The dealer block rides along on the collection so pages need no second call. */
let lastDealer: PublicDealer | null = null;
export const getLastDealer = (): PublicDealer | null => lastDealer;

export const bilboostLoader = (
  overrides: Partial<ApiClient> = {},
): LiveLoader<BilboostEntry, EntryFilter, never, BilboostError> => ({
  name: "bilboost-astro",

  loadCollection: async () => {
    try {
      const cfg = await getConfig();
      const client: ApiClient = { apiBase: cfg.apiBase, siteKey: cfg.siteKey, readToken: cfg.readToken, ...overrides };
      const list = await fetchVehicleList(client);
      lastDealer = list.dealer;
      const t = tagsFor(cfg.siteKey);
      const newest = list.vehicles.reduce((max, v) => Math.max(max, v.updated_at), 0);
      return {
        entries: list.vehicles.map((vehicle) => ({
          id: vehicle.id,
          data: vehicle,
          cacheHint: { tags: [t.car(vehicle.id)] },
        })),
        cacheHint: { tags: [t.all, t.list], lastModified: newest ? new Date(newest) : undefined },
      };
    } catch (err) {
      return { error: toError(err) };
    }
  },

  loadEntry: async ({ filter }) => {
    try {
      const cfg = await getConfig();
      const client: ApiClient = { apiBase: cfg.apiBase, siteKey: cfg.siteKey, readToken: cfg.readToken, ...overrides };
      const vehicle = await fetchVehicle(client, filter.id.toUpperCase());
      const t = tagsFor(cfg.siteKey);
      return {
        id: vehicle.id,
        data: vehicle,
        cacheHint: { tags: [t.all, t.car(vehicle.id)], lastModified: new Date(vehicle.updated_at) },
      };
    } catch (err) {
      return { error: toError(err) };
    }
  },
});

const toError = (err: unknown): BilboostError =>
  err instanceof BilboostError ? err : new BilboostError("unavailable", err instanceof Error ? err.message : String(err));

export { BilboostError };
