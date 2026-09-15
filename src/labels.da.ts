/**
 * Every visible string the package renders, in one place, so a site can
 * override a word without touching a component. Danish, sentence case, no
 * long dashes (house rule).
 */
export const LABELS = {
  list: {
    heading: "Biler til salg",
    count_one: "1 bil",
    count_many: "{n} biler",
    empty: "Ingen biler matcher dine valg.",
    empty_reset: "Nulstil filtre",
    unavailable_heading: "Bilerne kan ikke vises lige nu",
    unavailable_body: "Vi kunne ikke hente lageret. Prøv igen om et øjeblik, eller ring til os på {phone}.",
    unavailable_body_nophone: "Vi kunne ikke hente lageret. Prøv igen om et øjeblik.",
  },
  filters: {
    legend: "Find din bil",
    make: "Mærke",
    model: "Model",
    fuel: "Brændstof",
    any: "Alle",
    price_min: "Pris fra",
    price_max: "Pris til",
    year_min: "Årgang fra",
    km_max: "Højst km",
    search: "Søg",
    search_placeholder: "Fx Golf, automatgear, sort",
    sort: "Sortér",
    sort_nyeste: "Nyeste først",
    sort_pris_stigende: "Pris, lav til høj",
    sort_pris_faldende: "Pris, høj til lav",
    sort_km: "Færrest km",
    sort_aar: "Nyeste årgang",
    submit: "Vis biler",
    reset: "Nulstil",
  },
  pagination: { prev: "Forrige side", next: "Næste side", page: "Side {n} af {m}" },
  card: { view: "Se bilen", reserved: "Reserveret" },
  detail: {
    facts: "Fakta",
    equipment: "Udstyr",
    description: "Beskrivelse",
    price_note: "Prisen er inkl. leveringsomkostninger",
    back: "Tilbage til alle biler",
    similar: "Lignende biler",
    sold_heading: "Denne bil er solgt",
    sold_body: "{title} er ikke længere til salg. Se vores øvrige biler.",
    not_found_heading: "Bilen findes ikke",
    not_found_body: "Linket peger på en bil, vi ikke har. Se vores øvrige biler.",
  },
  gallery: {
    open: "Vis i fuld størrelse: {alt}",
    dialog: "Billeder af {title}",
    close: "Luk",
    prev: "Forrige billede",
    next: "Næste billede",
    counter: "{n} / {m}",
    none: "Der er ingen billeder af denne bil endnu.",
    /** Label on the "+N" thumbnail (0.1.3). */
    more: "Vis alle {n} billeder",
  },
  rail: { prev: "Forrige {label}", next: "Næste {label}" },
  inquiry: {
    heading: "Skriv om denne bil",
    intro: "Vi svarer typisk samme dag.",
    step_of: "Trin {n} af {m}",
    topic_title: "Hvad drejer det sig om?",
    topic_proevetur: "Prøvetur",
    topic_spoergsmaal: "Spørgsmål til bilen",
    topic_byttebil: "Jeg har en byttebil",
    topic_finansiering: "Finansiering",
    message_title: "Fortæl lidt mere",
    message: "Besked",
    trade_in: "Din nuværende bil (mærke, model, årgang)",
    contact_title: "Hvordan kontakter vi dig?",
    name: "Navn",
    phone: "Telefon",
    email: "E-mail",
    contact_hint: "Udfyld telefon eller e-mail. Gerne begge.",
    back: "Tilbage",
    next: "Næste",
    submit: "Send henvendelse",
    sending: "Sender…",
    required: "Feltet skal udfyldes.",
    phone_invalid: "Skriv et telefonnummer på mindst 6 cifre.",
    email_invalid: "Skriv en gyldig e-mailadresse.",
    contact_required: "Skriv telefon eller e-mail.",
    error: "Vi kunne ikke sende din henvendelse. Ring til os på {phone}, eller prøv igen om lidt.",
    error_nophone: "Vi kunne ikke sende din henvendelse. Prøv igen om lidt.",
    bot_failed: "Sikkerhedstjekket fejlede. Genindlæs siden og prøv igen.",
    nojs: "Formularen kræver JavaScript for at sende. Ring til os i stedet: {phone}.",
    privacy: "Vi bruger dine oplysninger til at svare på din henvendelse.",
  },
} as const;

/** Same shape as `LABELS`, but every value is a plain string so overrides type-check. */
export type Labels = { [G in keyof typeof LABELS]: { [K in keyof (typeof LABELS)[G]]: string } };

/** `{n}`-style placeholders. */
export const t = (template: string, vars: Record<string, string | number> = {}): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));

/** Deep override for a site: `mergeLabels({ list: { heading: "Brugte biler" } })`. */
export const mergeLabels = (overrides: DeepPartial<Labels> = {}): Labels => {
  const out = JSON.parse(JSON.stringify(LABELS)) as Record<string, Record<string, string>>;
  for (const [group, values] of Object.entries(overrides)) {
    if (!values || !(group in out)) continue;
    for (const [key, value] of Object.entries(values as Record<string, string>)) {
      if (typeof value === "string") out[group][key] = value;
    }
  }
  return out as unknown as Labels;
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
