/**
 * Live filtering on the list page, from the `data-bb-*` attributes the
 * package puts on every card wrapper. Without JavaScript the same form does a
 * plain GET and the server filters; with it, the list updates as you type
 * and the URL follows (`history.replaceState`), so a shared link reproduces
 * the view. Hidden cards get the `hidden` attribute, so their lazy images
 * never load.
 */

const fold = (value: string): string =>
  value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const num = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

type Card = {
  el: HTMLElement;
  make: string;
  model: string;
  fuel: string;
  price: number | null;
  year: number | null;
  km: number | null;
  created: number;
  text: string;
};

const readCards = (list: HTMLElement): Card[] =>
  Array.from(list.querySelectorAll<HTMLElement>('[data-bb="card"]')).map((el) => ({
    el,
    make: fold(el.dataset.bbMake ?? ""),
    model: fold(el.dataset.bbModel ?? ""),
    fuel: fold(el.dataset.bbFuel ?? ""),
    price: num(el.dataset.bbPrice),
    year: num(el.dataset.bbYear),
    km: num(el.dataset.bbKm),
    created: num(el.dataset.bbCreated) ?? 0,
    text: fold(el.dataset.bbSearch ?? el.textContent ?? ""),
  }));

const init = (root: HTMLElement) => {
  const form = root.querySelector<HTMLFormElement>('form[data-bb="filters"]');
  const list = root.querySelector<HTMLElement>('[data-bb="list"]');
  const count = root.querySelector<HTMLElement>('[data-bb="count"]');
  const empty = root.querySelector<HTMLElement>('[data-bb="empty"]');
  const pagination = root.querySelector<HTMLElement>('[data-bb="pagination"]');
  if (!form || !list) return;
  // Paging is server-side; with live filtering the whole list is on the page.
  if (list.dataset.bbAll !== "1") return;

  const cards = readCards(list);
  const pageSize = Number(list.dataset.bbPageSize) || 24;
  let shown = pageSize;

  const submitBtn = form.querySelector<HTMLElement>('[data-bb="filters-submit"]');
  if (submitBtn) submitBtn.hidden = true;
  if (pagination) pagination.hidden = true;

  const more = document.createElement("button");
  more.type = "button";
  more.dataset.bb = "more";
  more.className = list.dataset.bbMoreClass ?? "";
  more.textContent = list.dataset.bbMoreLabel ?? "Vis flere";
  more.addEventListener("click", () => {
    shown += pageSize;
    apply(false);
  });
  list.insertAdjacentElement("afterend", more);

  const value = (name: string): string => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value?.trim() ?? "";

  const apply = (resetShown: boolean) => {
    if (resetShown) shown = pageSize;
    const make = fold(value("maerke"));
    const model = fold(value("model"));
    const fuel = fold(value("braendstof"));
    const priceMin = num(value("pris_min"));
    const priceMax = num(value("pris_max"));
    const yearMin = num(value("aar_min"));
    const kmMax = num(value("km_max"));
    const q = fold(value("q"));
    const idQuery = /^bb \d+$/.test(q);
    const words = q.split(" ").filter(Boolean);
    const sort = value("sort") || "nyeste";
    // Same rule as `criteria.ts`: a BB id matches exactly, a phrase as a whole, else each word starts a token.
    const matchesSearch = (c: Card) => {
      if (!q) return true;
      if (idQuery) return fold(c.el.dataset.bbId ?? "") === q;
      if (c.text.includes(q)) return true;
      const tokens = c.text.split(" ");
      return words.every((w) => tokens.some((t) => t.startsWith(w)));
    };

    const matching = cards.filter((c) => {
      if (make && c.make !== make) return false;
      if (model && c.model !== model) return false;
      if (fuel && c.fuel !== fuel) return false;
      if (priceMin !== null && (c.price === null || c.price < priceMin)) return false;
      if (priceMax !== null && (c.price === null || c.price > priceMax)) return false;
      if (yearMin !== null && (c.year === null || c.year < yearMin)) return false;
      if (kmMax !== null && (c.km === null || c.km > kmMax)) return false;
      return matchesSearch(c);
    });

    const nullsLast = (a: number | null, b: number | null, dir: number) =>
      a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : (a - b) * dir;
    matching.sort((a, b) => {
      switch (sort) {
        case "pris_stigende": return nullsLast(a.price, b.price, 1);
        case "pris_faldende": return nullsLast(a.price, b.price, -1);
        case "km": return nullsLast(a.km, b.km, 1);
        case "aar": return nullsLast(a.year, b.year, -1);
        default: return b.created - a.created;
      }
    });

    const visible = new Set(matching.slice(0, shown).map((c) => c.el));
    for (const c of cards) c.el.hidden = !visible.has(c.el);
    // Reorder in the DOM so sort applies without a round trip.
    for (const c of matching) list.appendChild(c.el);

    if (count) count.textContent = matching.length === 1 ? (count.dataset.one ?? "1 bil") : (count.dataset.many ?? "{n} biler").replace("{n}", String(matching.length));
    if (empty) empty.hidden = matching.length > 0;
    more.hidden = matching.length <= shown;

    // Keep the address bar shareable: known params only, defaults dropped.
    const p = new URLSearchParams(window.location.search);
    const set = (k: string, v: string, def = "") => (v && v !== def ? p.set(k, v) : p.delete(k));
    set("maerke", value("maerke"));
    set("model", value("model"));
    set("braendstof", value("braendstof"));
    set("pris_min", value("pris_min"));
    set("pris_max", value("pris_max"));
    set("aar_min", value("aar_min"));
    set("km_max", value("km_max"));
    set("q", value("q"));
    set("sort", sort, "nyeste");
    p.delete("side");
    const query = p.toString();
    history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    list.dispatchEvent(new CustomEvent("bb:filtered", { detail: { count: matching.length } }));
  };

  let timer = 0;
  form.addEventListener("input", (e) => {
    const target = e.target as HTMLElement;
    const debounce = target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox" ? 180 : 0;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => apply(true), debounce);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    apply(true);
  });
  form.addEventListener("reset", () => window.setTimeout(() => apply(true), 0));

  apply(false);
};

for (const root of document.querySelectorAll<HTMLElement>('[data-bb="listing"]')) init(root);

export {};
