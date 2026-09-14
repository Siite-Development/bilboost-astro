# Hooks — the styling contract

Every element the package renders carries a `data-bb="…"` attribute. **The
site styles those hooks; the package never ships colours, fonts or spacing.**
The hooks are the public API: a PATCH or MINOR release never removes or
renames one, and never changes what is nested inside what. See "Versioning"
in README.md.

Most components also accept a `class` prop (and a few `*Class` props for
their inner buttons/inputs) for Tailwind-style sites that prefer classes to
attribute selectors. Both work; pick one per site.

## List page

| Hook | Element | Notes |
|---|---|---|
| `data-bb="listing"` | wrapper the SITE puts around filters + list | required for live filtering |
| `data-bb="filters"` | `<form method="get">` | `role="search"` |
| `data-bb="filter"` `data-bb-filter="maerke\|model\|braendstof\|pris\|aar\|km\|q\|sort"` | one field group | label + input/select |
| `data-bb="filter-actions"` | submit + reset | submit is hidden by the script |
| `data-bb="filters-submit"`, `data-bb="filters-reset"` | button, link | |
| `data-bb="count"` | `<p aria-live>` | "21 biler" |
| `data-bb="list"` | `<ul>` | `data-bb-all="1"` when the whole list is on the page |
| `data-bb="card"` | `<li>` | attrs: `data-bb-id`, `-make`, `-model`, `-fuel`, `-price`, `-year`, `-km`, `-status`, `-created`, `-search`; the site's own card markup is inside |
| `data-bb="more"` | `<button>` inserted after the list | class from `moreClass` |
| `data-bb="empty"` | no-match message | hidden while matches exist |
| `data-bb="pagination"` | `<nav>` | `-prev`, `-status`, `-next`; hidden under live filtering |
| `data-bb="unavailable"` `data-bb-variant="unavailable"` | 503 state | see detail |

## Detail page

| Hook | Element |
|---|---|
| `data-bb="gallery"` | wrapper, `data-bb-count` |
| `data-bb="gallery-open"` `data-bb-index` | `<button>` around each photo |
| `data-bb="gallery-thumbs"` | `<ul>` of the rest |
| `data-bb="gallery-empty"` | no photos |
| `data-bb="lightbox"` | `<dialog>` — centred, `max-width: min(90vw, 62rem)`, image `max-height: 72dvh` (in `styles/base.css`) |
| `data-bb="lightbox-panel"`, `-image`, `-bar`, `-prev`, `-next`, `-close`, `-counter`, `-caption` | inside the dialog |
| `data-bb="price"` `data-bb-has-price="1\|0"` | `<span>`; inner `price-amount` (the advertised TOTAL incl. delivery), `price-delivery` ("heraf leveringsomkostninger …") |
| `data-bb="status"` `data-bb-status="reserveret"` | badge; absent on a car in stock |
| `data-bb="facts"` | `<section>`; `facts-heading`, `facts-list` (`<dl>`), `fact` (`<div>` with `<dt><dd>`) |
| `data-bb="equipment"` | `<section>`; `equipment-heading`, `equipment-list` (`<ul>`) |
| `data-bb="image"` | `<span>` around a responsive `<img>` |
| `data-bb="unavailable"` `data-bb-variant="sold\|not_found\|unavailable"` | `unavailable-heading` (`<h1>`), `-body`, `-link` |

## Rail (mobile card rail)

`data-bb="rail"` (`data-bb-rail-from`, `--bb-rail-card`), `rail-viewport`,
`rail-nav`, `rail-track`, `rail-progress` (`--bb-rail-s` = scaleX),
`rail-arrows`, `rail-prev`, `rail-next`. The class `bb-rail--on` is set by the
script below the breakpoint; arrows sit to the LEFT (the sticky contact widget
owns the right corner).

## Inquiry form

`form[data-bb="inquiry"]` (`data-bb-endpoint`, `data-bb-turnstile-key`,
`data-bb-labels`), `inquiry-header`, `inquiry-heading`, `inquiry-intro`,
`inquiry-progress` (`<ol>` with `data-bb-step-marker="n"`, `aria-current="step"`),
`inquiry-step-line` / `inquiry-step-now`, `inquiry-step` (`<fieldset data-bb-step="topic|message|contact">`,
`legend[data-bb-step-title]`), `inquiry-field` (`[data-bb-field]`), `inquiry-topic`
(`<label>` around a radio), `field-error` (`role="alert"`), `inquiry-hint`,
`inquiry-turnstile`, `inquiry-privacy`, `inquiry-live` (sr-only), `inquiry-error`,
`inquiry-actions`, `inquiry-back`, `inquiry-next`, `inquiry-submit`, `inquiry-nojs`,
`inquiry-honeypot` (never style; it must stay off-screen).

The class `bb-inquiry--steps` is added to the form once the script has taken
over; style the one-page fallback without it.

## CSS variables the package reads

- `--bb-rail-card` — card width in the rail (default `min(78vw, 320px)`)
- `--bb-rail-s` — set by the script; the progress bar's `scaleX`

## Events

- `bb:filtered` on `[data-bb="list"]`, `detail.count` — after each live filter.

## What a version bump may change

| Bump | May change |
|---|---|
| PATCH | behaviour, accessibility, formatting, JSON-LD, cache values, security fixes, `styles/base.css` |
| MINOR | new optional props, new hooks, new components, new filters (off by default), new env var with a fallback |
| MAJOR | a removed or renamed hook, changed nesting, a required prop or env var, changed slot arguments, an Astro or adapter major |
