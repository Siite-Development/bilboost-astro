import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import sitemap from "@astrojs/sitemap";
import bilboost from "bilboost-astro/integration";
import { SITE } from "./src/config/site.mjs";

export default defineConfig({
  site: SITE.url,
  trailingSlash: "always",
  build: { format: "directory" },
  adapter: cloudflare({ imageService: "compile" }),
  cache: { provider: cacheCloudflare() },
  integrations: [
    bilboost({ siteKey: "demo-biler", basePath: "/bilsalg", siteUrl: SITE.url, similar: true }),
    sitemap({ customSitemaps: [`${SITE.url}/sitemap-biler.xml`] }),
  ],
});
