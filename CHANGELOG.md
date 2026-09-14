# Changelog

All notable changes. Versions follow the rules in HOOKS.md ("What a version
bump may change").

## 0.1.0 — 2026-09-14

First cut, built against BilBoost contract v1 and `astro@7.3.2` /
`@astrojs/cloudflare@14.3.1`.

- Integration: routes `/api/bilboost/revalidate`, `/api/bilboost/health`,
  `/sitemap-biler.xml`; middleware (devsite `noindex`, canonical filter
  query); env schema; `virtual:bilboost/options`.
- Live loader over the read API with cache hints per list and car.
- Route caching profiles (`maxAge 300 / swr 900`), devsite opt-out, 503 that
  is never stored.
- Signed push verification (shared vectors with BilBoost), direct
  `cloudflare:workers` purge with the result read, 2 s purge gap.
- Criteria: filter, sort, search (Danish folding), facets, paging, similar.
- Components: `BbVehicleList` (site-supplied card slot), `BbFilters`,
  `BbResultCount`, `BbEmpty`, `BbPagination`, `BbVehicleGallery` (dialog
  lightbox), `BbVehicleFacts`, `BbEquipment`, `BbPrice`, `BbStatusBadge`,
  `BbImage`, `BbJsonLd`, `BbRail`, `BbUnavailable`, `BbInquiryForm` (three
  steps, Turnstile, posts to BilBoost).
- `bin/bilboost-astro check|sign-test`.
