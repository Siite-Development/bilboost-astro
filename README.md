# bilboost-astro

BilBoost cars on a dealer's Astro site. **Behaviour lives here; the site owns
the look.** A fix in this package reaches every dealer site with a version
bump; a design change on one site touches only that site's four files.

- Cars are read from BilBoost at request time (live collection), rendered on
  Cloudflare Workers and cached at the edge with route caching.
- BilBoost pushes a signed "these BB ids changed" message; the site purges
  exactly those cache tags. A lost push costs at most five minutes.
- "Skriv om denne bil" posts straight to BilBoost and lands as a lead on the
  car in the dealer's CRM.

Ships as TypeScript source (no build step): the site's Vite compiles it.
Installed from GitHub by tag, never from npm.

## Install on a dealer site

```sh
npm i astro@7.3.2 @astrojs/cloudflare@14.3.1 "github:Siite-Development/bilboost-astro#v0.1.0"
```

`astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import sitemap from "@astrojs/sitemap";
import bilboost from "bilboost-astro/integration";
import { SITE } from "./src/config/site.mjs";

export default defineConfig({
  site: SITE.url,
  adapter: cloudflare({ imageService: "compile" }),   // NOT the default: that provisions a paid Images binding
  cache: { provider: cacheCloudflare() },
  integrations: [
    bilboost({ siteKey: "monzes-auto", basePath: "/bilsalg", siteUrl: SITE.url }),
    sitemap({ customSitemaps: [`${SITE.url}/sitemap-biler.xml`] }),
  ],
});
```

`wrangler.toml`:

```toml
name = "monzes-auto"
main = "@astrojs/cloudflare/entrypoints/server"
compatibility_date = "2026-09-12"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"

[cache]
enabled = true          # do NOT set cross_version_cache

[vars]
BILBOOST_API_BASE = "https://pastel-civet-419.eu-west-1.convex.site"   # copy from `npx convex deploy` output, region segment included
PUBLIC_TURNSTILE_SITE_KEY = "…"
```

Secrets are set by a person in the Cloudflare dashboard, never committed:
`BILBOOST_READ_TOKEN`, `BILBOOST_WEBHOOK_SECRET` (and
`BILBOOST_WEBHOOK_SECRET_NEXT` during a rotation). Locally, put them in
`.dev.vars` (gitignored).

Then copy the five files from `examples/site/` into the site and restyle:

| File | What it is |
|---|---|
| `src/live.config.ts` | registers the `biler` live collection |
| `src/pages/bilsalg/index.astro` | the list page (thin) |
| `src/pages/bilsalg/[slug].astro` | the detail page (thin) |
| `src/components/biler/BilKort.astro` | **the card — the site's markup** |
| `src/styles/bilboost.css` | rules on the `[data-bb]` hooks, using the site's tokens |
| `src/config/bilboost.mjs` | labels, phone, which filters, page size |

Site-owned = restyle freely. Everything else comes from the package and is
fixed in one place.

## What the package does and does not decide

**Package (behaviour, one place):** loading, caching, purging, the revalidate
and health routes, the car sitemap, filter/sort/search/paging, the gallery
and lightbox, the mobile rail, the inquiry form's steps and validation and
posting, Danish formatting, the reserved badge, JSON-LD, the 404/410/503
states, `noindex` on devsites, canonical filter URLs.

**Site (look, per dealer):** the card's markup, every colour/font/spacing
rule (on the hooks in HOOKS.md), page composition and headings, copy
overrides, which filters to show.

**Where "fix once" does not apply:** site-specific copy and SEO titles; a
dealer who wants a structurally different list (a table, a map) composes it
on the site — a second list component enters the package only when two
dealers want the same thing; breaking markup changes are a major and get a
visual check per site; visual bugs caused by site CSS are fixed on the site;
the rail is a port of `Masters/tools/SwipeRail.astro`, so a fix there is
ported by hand. A version bump still needs a rebuild of each site: "one place
to fix" is not "one place to deploy".

## Cache facts worth knowing

- Cloudflare Workers Cache keys on **path, not host**: a page cached from
  `*.workers.dev` would be served on the real domain. So devsite hosts are
  never cached and get `X-Robots-Tag: noindex` from the middleware, the
  canonical always points at production, and a **new version must be
  deployed before DNS cutover** (the Worker version is part of the cache key,
  so a deploy starts cold).
- Purges are rate-limited **per Cloudflare account** at Free-tier numbers for
  Workers Cache (5/min, burst 25) whatever the plan. BilBoost budgets for
  this; the site adds a 2 s purge gap so a leaked secret cannot burn it.
- Never add `s-maxage` or `must-revalidate` on a car route: either switches
  off stale-if-error, which is what keeps the site up while BilBoost is down.
- With a cold cache and BilBoost unreachable, the page is a 503 with the
  dealer's phone number, never cached. An empty list is never cached after an
  error.

## Checks against a running site

```sh
npx bilboost-astro check https://monzesauto.dk --base /bilsalg
npx bilboost-astro sign-test https://monzesauto.dk --secret "$BILBOOST_WEBHOOK_SECRET" --site-key monzes-auto --dry-run
```

`check` looks at the list and one detail page: one `h1`, canonical,
`width/height/loading` on every image, JSON-LD parses, the hooks exist, no
`external_raw` / `license_plate`, no long dashes, health 200,
`sitemap-biler.xml` 200. The house gates read `dist/` and never see these
pages, so run this instead.

## Development

```sh
npm ci
npm test          # vitest over criteria, format, slug, signature (shared vectors), loader, revalidate, cache, jsonld
npm run typecheck
```

Contract: `fixtures/public-vehicle.json` and `fixtures/signature-vectors.json`
are shared with the BilBoost repo (`convex/lib/publicVehicle.test.ts`,
`convex/lib/siteSignature.test.ts`). Change them in both places.

## Versioning

Sites pin `"bilboost-astro": "github:Siite-Development/bilboost-astro#v1.2.3"`
(lockfile generated with `npx -y npm@10.9.2`, the version Cloudflare's build
uses). PATCH/MINOR/MAJOR rules are in HOOKS.md; a hook contract test fails on
any hook removal without a major.
