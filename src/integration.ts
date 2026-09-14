import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { AstroIntegration } from "astro";
import { envField } from "astro/config";
import { resolveOptions, type BilboostOptions } from "./options.ts";

/**
 * `bilboost()` in `astro.config.mjs`:
 *
 *   import bilboost from "bilboost-astro/integration";
 *   export default defineConfig({
 *     adapter: cloudflare({ imageService: "compile" }),
 *     cache: { provider: cacheCloudflare() },
 *     integrations: [bilboost({ siteKey: "monzes-auto", basePath: "/bilsalg", siteUrl: "https://monzesauto.dk" })],
 *   });
 *
 * It injects the three routes, the middleware, the env schema, and freezes
 * the options into `virtual:bilboost/options`. The car pages themselves are
 * the site's own thin files (see `examples/site/`), because their layout is
 * the site's.
 */

const VIRTUAL_ID = "virtual:bilboost/options";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/**
 * Astro 7 imports its Markdown engine (Sätteri) eagerly, and the Worker
 * build resolves it to the WebAssembly binding `@bruits/satteri-wasm32-wasi`
 * — an optional dependency npm never installs (its `cpu` is `wasm32`), so
 * every Cloudflare build fails with "failed to resolve import" even on a
 * site with no Markdown at all (withastro/astro#17585; #17586 would make the
 * import lazy). Until that ships: when the binding is not installed, resolve
 * it to a stub whose exports throw if Markdown is ever rendered at request
 * time. A site that installs the binding keeps real Markdown.
 */
const SATTERI_WASM = "@bruits/satteri-wasm32-wasi";
const SATTERI_STUB = "\0bilboost:satteri-stub";

const satteriStubPlugin = (root: URL) => {
  const require = createRequire(root);
  let installed: boolean | null = null;
  const isInstalled = () => {
    if (installed === null) {
      try {
        require.resolve(`${SATTERI_WASM}/package.json`);
        installed = true;
      } catch {
        installed = false;
      }
    }
    return installed;
  };
  /** The names satteri re-exports from the binding: `dist/binding.browser.js` next to its entry. */
  const exportNames = (): string[] => {
    try {
      const entry = require.resolve("satteri");
      const src = readFileSync(new URL("./binding.browser.js", `file://${entry}`), "utf8");
      const braces = /export\s*\{([^}]*)\}/.exec(src)?.[1] ?? "";
      return braces
        .split(",")
        .map((s) => s.trim().split(/\s+as\s+/).pop() ?? "")
        .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
    } catch {
      return [];
    }
  };
  return {
    name: "bilboost-satteri-stub",
    resolveId: (id: string) => (id === SATTERI_WASM && !isInstalled() ? SATTERI_STUB : undefined),
    load: (id: string) => {
      if (id !== SATTERI_STUB) return undefined;
      const message = "Markdown-rendering er ikke tilgængelig i denne Worker (bilboost-astro stub for @bruits/satteri-wasm32-wasi)";
      const body = exportNames()
        .map((name) => `export const ${name} = () => { throw new Error(${JSON.stringify(message)}); };`)
        .join("\n");
      return `${body}\nexport default {};\n`;
    },
  };
};

const bilboost = (input: BilboostOptions): AstroIntegration => {
  const options = resolveOptions(input);
  return {
    name: "bilboost-astro",
    hooks: {
      "astro:config:setup": ({ config, injectRoute, addMiddleware, updateConfig, logger }) => {
        // Under `trailingSlash: "always"` (the house default) an extensionless
        // route only matches WITH the slash, and the bare URL 301s to it.
        // BilBoost's push follows that redirect (`sendPush`), so either
        // spelling works; the pattern just follows the site's own setting.
        const slash = config.trailingSlash === "always" ? "/" : "";
        injectRoute({ pattern: `/api/bilboost/revalidate${slash}`, entrypoint: "bilboost-astro/routes/revalidate", prerender: false });
        injectRoute({ pattern: `/api/bilboost/health${slash}`, entrypoint: "bilboost-astro/routes/health", prerender: false });
        injectRoute({ pattern: "/sitemap-biler.xml", entrypoint: "bilboost-astro/routes/sitemap", prerender: false });
        addMiddleware({ order: "pre", entrypoint: "bilboost-astro/middleware" });

        updateConfig({
          env: {
            schema: {
              BILBOOST_API_BASE: envField.string({ context: "server", access: "public" }),
              BILBOOST_READ_TOKEN: envField.string({ context: "server", access: "secret" }),
              BILBOOST_WEBHOOK_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
              BILBOOST_WEBHOOK_SECRET_NEXT: envField.string({ context: "server", access: "secret", optional: true }),
              PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: "client", access: "public", optional: true }),
            },
          },
          vite: {
            // Ships as TypeScript: Vite must compile it, and the virtual module must resolve inside it.
            ssr: { noExternal: ["bilboost-astro"] },
            plugins: [
              {
                name: "bilboost-options",
                resolveId: (id: string) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
                load: (id: string) =>
                  id === RESOLVED_ID ? `export default ${JSON.stringify(options)};` : undefined,
              },
              satteriStubPlugin(config.root),
            ],
          },
        });

        logger.info(`biler for "${options.siteKey}" under ${options.basePath}/`);
      },
    },
  };
};

export default bilboost;
export { bilboost };
export type { BilboostOptions };
