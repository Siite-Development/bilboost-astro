import type { PublicVehicle } from "./contract.ts";

/**
 * Filtering, sorting, paging and search over the list, driven by URL query
 * parameters so a filtered list is shareable, cache-friendly and works with
 * JavaScript off (the filter form is a plain GET). The client script does the
 * same filtering live from `data-bb-*` attributes and keeps the URL in sync.
 *
 * Parameter names are Danish because they appear in the address bar.
 */

export const SORTS = ["nyeste", "pris_stigende", "pris_faldende", "km", "aar"] as const;
export type Sort = (typeof SORTS)[number];

export type Criteria = {
  maerke: string | null;
  model: string | null;
  braendstof: string | null;
  pris_min: number | null;
  pris_max: number | null;
  aar_min: number | null;
  km_max: number | null;
  q: string | null;
  sort: Sort;
  side: number;
};

export const CRITERIA_KEYS = ["maerke", "model", "braendstof", "pris_min", "pris_max", "aar_min", "km_max", "q", "sort", "side"] as const;

const num = (value: string | null): number | null => {
  if (value === null || value.trim() === "") return null;
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

const text = (value: string | null): string | null => {
  const v = (value ?? "").trim().slice(0, 80);
  return v ? v : null;
};

export const parseCriteria = (params: URLSearchParams): Criteria => {
  const sort = params.get("sort");
  const side = num(params.get("side"));
  return {
    maerke: text(params.get("maerke")),
    model: text(params.get("model")),
    braendstof: text(params.get("braendstof")),
    pris_min: num(params.get("pris_min")),
    pris_max: num(params.get("pris_max")),
    aar_min: num(params.get("aar_min")),
    km_max: num(params.get("km_max")),
    q: text(params.get("q")),
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "nyeste",
    side: side && side >= 1 ? side : 1,
  };
};

/** The one query string for a set of criteria: fixed order, defaults omitted, so every variant caches once. */
export const canonicalQuery = (c: Criteria): string => {
  const p = new URLSearchParams();
  if (c.maerke) p.set("maerke", c.maerke);
  if (c.model) p.set("model", c.model);
  if (c.braendstof) p.set("braendstof", c.braendstof);
  if (c.pris_min !== null) p.set("pris_min", String(c.pris_min));
  if (c.pris_max !== null) p.set("pris_max", String(c.pris_max));
  if (c.aar_min !== null) p.set("aar_min", String(c.aar_min));
  if (c.km_max !== null) p.set("km_max", String(c.km_max));
  if (c.q) p.set("q", c.q);
  if (c.sort !== "nyeste") p.set("sort", c.sort);
  if (c.side > 1) p.set("side", String(c.side));
  const s = p.toString();
  return s ? `?${s}` : "";
};

/** Danish-aware folding for search: æ/ø/å and accents, case, punctuation. */
export const searchFold = (value: string): string =>
  value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const searchText = (v: PublicVehicle): string =>
  searchFold([v.id, v.make, v.model, v.variant ?? "", v.color ?? "", v.fuel_type ?? "", String(v.year ?? "")].join(" "));

export const matchesCriteria = (v: PublicVehicle, c: Criteria): boolean => {
  if (c.maerke && searchFold(v.make) !== searchFold(c.maerke)) return false;
  if (c.model && searchFold(v.model) !== searchFold(c.model)) return false;
  if (c.braendstof && searchFold(v.fuel_type ?? "") !== searchFold(c.braendstof)) return false;
  if (c.pris_min !== null && (v.price === null || v.price < c.pris_min)) return false;
  if (c.pris_max !== null && (v.price === null || v.price > c.pris_max)) return false;
  if (c.aar_min !== null && (v.year === null || v.year < c.aar_min)) return false;
  if (c.km_max !== null && (v.mileage === null || v.mileage > c.km_max)) return false;
  if (c.q) return matchesSearch(v, c.q);
  return true;
};

/**
 * A query is a BB id, a phrase, or words that each start a token. Prefix
 * matching on tokens rather than substring on the whole text, so "2" does
 * not match every car with a year or a "320d".
 */
export const matchesSearch = (v: PublicVehicle, query: string): boolean => {
  const q = searchFold(query);
  if (!q) return true;
  if (/^bb \d+$/.test(q)) return searchFold(v.id) === q;
  const haystack = searchText(v);
  if (haystack.includes(q)) return true;
  const tokens = haystack.split(" ");
  return q.split(" ").every((word) => tokens.some((token) => token.startsWith(word)));
};

export const filterVehicles = (vehicles: PublicVehicle[], c: Criteria): PublicVehicle[] =>
  vehicles.filter((v) => matchesCriteria(v, c));

/** Cars without a price sort last on price; without km/year likewise. */
const nullsLast = (a: number | null, b: number | null, dir: 1 | -1): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
};

export const sortVehicles = (vehicles: PublicVehicle[], sort: Sort): PublicVehicle[] => {
  const out = [...vehicles];
  switch (sort) {
    case "pris_stigende": return out.sort((a, b) => nullsLast(a.price, b.price, 1));
    case "pris_faldende": return out.sort((a, b) => nullsLast(a.price, b.price, -1));
    case "km": return out.sort((a, b) => nullsLast(a.mileage, b.mileage, 1));
    case "aar": return out.sort((a, b) => nullsLast(a.year, b.year, -1));
    default: return out.sort((a, b) => b.created_at - a.created_at);
  }
};

export type Facets = {
  makes: { value: string; count: number }[];
  models: { value: string; count: number }[];
  fuels: { value: string; count: number }[];
  price: { min: number; max: number } | null;
  year: { min: number; max: number } | null;
};

/** Counts over the FULL list, so a filter never hides the options that would widen it. */
export const facets = (vehicles: PublicVehicle[], c?: Pick<Criteria, "maerke">): Facets => {
  const count = (values: (string | null)[]) => {
    const map = new Map<string, number>();
    for (const v of values) if (v) map.set(v, (map.get(v) ?? 0) + 1);
    return [...map.entries()].map(([value, n]) => ({ value, count: n })).sort((a, b) => a.value.localeCompare(b.value, "da"));
  };
  const range = (values: (number | null)[]) => {
    const nums = values.filter((n): n is number => n !== null);
    return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null;
  };
  const forModels = c?.maerke ? vehicles.filter((v) => searchFold(v.make) === searchFold(c.maerke!)) : vehicles;
  return {
    makes: count(vehicles.map((v) => v.make)),
    models: count(forModels.map((v) => v.model)),
    fuels: count(vehicles.map((v) => v.fuel_type)),
    price: range(vehicles.map((v) => v.price)),
    year: range(vehicles.map((v) => v.year)),
  };
};

export type Page<T> = { items: T[]; page: number; pages: number; total: number; pageSize: number };

export const paginate = <T>(items: T[], page: number, pageSize: number): Page<T> => {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pages, total: items.length, pageSize };
};

/** One call for a list page: filter, sort, page. */
export const applyCriteria = (vehicles: PublicVehicle[], c: Criteria, pageSize: number): Page<PublicVehicle> =>
  paginate(sortVehicles(filterVehicles(vehicles, c), c.sort), c.side, pageSize);

/** "Lignende biler": same make first, then same fuel, then nearest price. Never the car itself. */
export const similar = (vehicles: PublicVehicle[], v: PublicVehicle, n = 4): PublicVehicle[] =>
  vehicles
    .filter((o) => o.id !== v.id)
    .map((o) => {
      let score = 0;
      if (o.make === v.make) score += 4;
      if (o.fuel_type && o.fuel_type === v.fuel_type) score += 2;
      if (o.price !== null && v.price !== null) score += Math.max(0, 2 - Math.abs(o.price - v.price) / Math.max(v.price, 1));
      return { o, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.o);
