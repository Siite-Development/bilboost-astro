# Changelog

All notable changes. Versions follow the rules in HOOKS.md ("What a version
bump may change").

## 0.1.3 — 2026-09-15

- The gallery's thumbnail strip shows at most `maxThumbs` thumbnails (default 4).
  When a car has more photos, the last visible thumbnail carries "+N" (hook
  `data-bb="gallery-more"`) and opens the lightbox there; the rest stay in the
  markup, `hidden`, so the lightbox still steps through every photo. A site
  that showed five thumbnails in a row should now size its strip for four.

## 0.1.2 — 2026-09-15

- Sideways feed photos can be turned upright in BilBoost ("Drej billede"). The
  contract carries it as an optional `rotation` (90/180/270) on a
  `PublicImage`, additive to v1. `BbImage`, the gallery hero and thumbnails
  get `data-bb-rotate` on their frame, the lightbox image gets it too, and
  `styles/base.css` turns them while still covering the 4:3 frame. Auto IT
  delivers some photos with the pixels rotated and no EXIF orientation, so
  nothing in the file could do this automatically.
- `*.localhost` is a devsite host by default (never cached, `noindex`). The
  house dev URL is `<slug>.localhost:4400`, and car pages there were cached
  for five minutes, so a car edit on BilBoost dev looked like it did nothing.

## 0.1.1 — 2026-09-14

- The advertised price is the TOTAL including mandatory delivery costs, as
  Danish prismærkningsregler require (contract field
  `price_includes_delivery`, additive). `BbPrice` shows the total with
  "heraf leveringsomkostninger …" under it; price filters, sorting, facets,
  "lignende biler" and JSON-LD use the total. `data-bb-price` on a card is
  the total.

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
