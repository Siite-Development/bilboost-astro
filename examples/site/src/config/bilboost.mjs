/**
 * Site-owned settings for the car pages. Copy is Danish, no long dashes.
 * Everything here is what a designer may change without touching behaviour.
 */
export const BILBOOST = {
  siteKey: "demo-biler",
  basePath: "/bilsalg",
  /** Shown in the 503 state and under the inquiry form. */
  phone: "+45 12 34 56 78",
  /** Which filters the list shows, in order. */
  filters: ["q", "maerke", "model", "braendstof", "pris", "sort"],
  pageSize: 24,
  /** "Lignende biler" on the detail page. Puts detail pages on the list cache tag. */
  similar: true,
  /** Label overrides; see `bilboost-astro/labels` for every key. */
  labels: {
    list: { heading: "Brugte biler til salg" },
    filters: { search_placeholder: "Søg mærke eller model" },
    inquiry: { intro: "Vi svarer typisk samme dag. Ring gerne, hvis det haster." },
  },
  /** Tailwind-style class maps for the package components (optional). */
  classes: {
    button: "btn btn-primary",
    secondaryButton: "btn btn-secondary",
    input: "input",
    field: "field",
  },
};
