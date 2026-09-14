import type { PublicVehicle } from "./contract.ts";

/**
 * Detail URLs are `{basePath}/{slug}/` where the slug ends in the BB id:
 * `bmw-320d-touring-2019-bb-12`. The id is what the page resolves on; the
 * words are for people and search engines, and a stale slug 301s to the
 * current one.
 */

const ID_SUFFIX = /(?:^|-)(bb-\d+)\/?$/i;

/** The BB id from a slug, upper-cased (`BB-12`), or null when there is none. */
export const parseSlug = (slug: string): string | null => {
  const m = ID_SUFFIX.exec(slug.trim());
  return m ? m[1].toUpperCase() : null;
};

export const canonicalPath = (basePath: string, v: Pick<PublicVehicle, "slug">): string =>
  `${basePath}/${v.slug}/`;

export const listPath = (basePath: string): string => `${basePath}/`;
