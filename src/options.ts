/**
 * Options the site passes to `bilboost()` in `astro.config.mjs`. They are
 * frozen into the build through the `virtual:bilboost/options` module, so the
 * loader, routes and middleware read them without any per-request plumbing.
 */
export type BilboostOptions = {
  /** The dealer's site key as configured in BilBoost, e.g. `monzes-auto`. */
  siteKey: string;
  /** Where the car pages live, e.g. `/bilsalg`. No trailing slash. */
  basePath: string;
  /** Production origin, used for canonical URLs and JSON-LD. */
  siteUrl: string;
  /** Show "Lignende biler" on the detail page. Puts detail pages on the list tag. Default false. */
  similar?: boolean;
  /** Cache on `*.workers.dev` / `*.devsiite.dk` too — only for a cache test on a devsite. Default false. */
  cacheOnDevsite?: boolean;
  /** Cars per list page. Default 24. */
  pageSize?: number;
  /** Hostname suffixes treated as devsites: never cached, always `noindex`. */
  devsiteHosts?: string[];
};

export type ResolvedOptions = Required<BilboostOptions>;

/** `.localhost` covers `<slug>.localhost:4400`, the house's per-repo dev URL (0.1.2). */
export const DEFAULT_DEVSITE_HOSTS = [".workers.dev", ".devsiite.dk", "localhost", ".localhost", "127.0.0.1"];

export const resolveOptions = (input: BilboostOptions): ResolvedOptions => {
  if (!/^[a-z0-9-]{3,40}$/.test(input.siteKey)) {
    throw new Error(`bilboost: siteKey "${input.siteKey}" must match ^[a-z0-9-]{3,40}$`);
  }
  const basePath = `/${input.basePath.replace(/^\/+|\/+$/g, "")}`;
  if (basePath === "/") throw new Error("bilboost: basePath must not be the site root");
  let siteUrl: string;
  try {
    siteUrl = new URL(input.siteUrl).origin;
  } catch {
    throw new Error(`bilboost: siteUrl "${input.siteUrl}" is not a URL`);
  }
  return {
    siteKey: input.siteKey,
    basePath,
    siteUrl,
    similar: input.similar ?? false,
    cacheOnDevsite: input.cacheOnDevsite ?? false,
    pageSize: input.pageSize ?? 24,
    devsiteHosts: input.devsiteHosts ?? DEFAULT_DEVSITE_HOSTS,
  };
};

export const isDevsiteHost = (hostname: string, opts: Pick<ResolvedOptions, "devsiteHosts">): boolean =>
  opts.devsiteHosts.some((h) => (h.startsWith(".") ? hostname.endsWith(h) : hostname === h));
