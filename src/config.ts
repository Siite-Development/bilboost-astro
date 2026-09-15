import type { ResolvedOptions } from "./options.ts";

/**
 * Runtime configuration: the frozen integration options plus the env the
 * Worker was given. Read lazily and cached per isolate, because
 * `astro:env/server` only exists inside an Astro build and the package's own
 * tests never import it.
 */

export type RuntimeConfig = ResolvedOptions & {
  apiBase: string;
  readToken: string;
  webhookSecrets: string[];
  /** `PUBLIC_TURNSTILE_SITE_KEY`, reported (never its value) by the health route. */
  turnstileSiteKey?: string | null;
};

let cached: Promise<RuntimeConfig> | null = null;

export const getConfig = (): Promise<RuntimeConfig> => {
  cached ??= (async () => {
    const [{ default: options }, env, clientEnv] = await Promise.all([
      import("virtual:bilboost/options"),
      import("astro:env/server"),
      import("astro:env/client"),
    ]);
    const apiBase = (env.BILBOOST_API_BASE ?? "").replace(/\/+$/, "");
    if (!apiBase) throw new Error("BILBOOST_API_BASE mangler");
    if (!env.BILBOOST_READ_TOKEN) throw new Error("BILBOOST_READ_TOKEN mangler");
    return {
      ...options,
      apiBase,
      readToken: env.BILBOOST_READ_TOKEN,
      webhookSecrets: [env.BILBOOST_WEBHOOK_SECRET, env.BILBOOST_WEBHOOK_SECRET_NEXT].filter(
        (s): s is string => !!s,
      ),
      turnstileSiteKey: clientEnv.PUBLIC_TURNSTILE_SITE_KEY ?? null,
    };
  })();
  return cached;
};

/** Test seam: replace the config for one test, then call with `null` to reset. */
export const __setConfigForTests = (config: RuntimeConfig | null): void => {
  cached = config ? Promise.resolve(config) : null;
};
