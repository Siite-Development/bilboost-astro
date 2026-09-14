import { describe, expect, test } from "vitest";
import fixture from "../fixtures/public-vehicle.json";
import type { PublicVehicle } from "../src/contract.ts";
import { applyCriteria, canonicalQuery, facets, filterVehicles, paginate, parseCriteria, searchFold, similar, sortVehicles } from "../src/criteria.ts";

const base = fixture.vehicle as PublicVehicle;
const car = (patch: Partial<PublicVehicle>): PublicVehicle => ({ ...base, ...patch });

const lager = [
  car({ id: "BB-1", slug: "a-bb-1", make: "BMW", model: "320d", price: 289_900, mileage: 88_000, year: 2019, fuel_type: "Diesel", created_at: 3 }),
  car({ id: "BB-2", slug: "b-bb-2", make: "Volvo", model: "XC90", price: 599_000, mileage: 20_000, year: 2023, fuel_type: "El", created_at: 2 }),
  car({ id: "BB-3", slug: "c-bb-3", make: "Citroën", model: "Berlingo", price: null, mileage: null, year: 2015, fuel_type: "Benzin", created_at: 1, variant: "Ærø" }),
];

describe("parseCriteria / canonicalQuery", () => {
  test("defaults are omitted and order is fixed", () => {
    const c = parseCriteria(new URLSearchParams("sort=nyeste&side=1&q=&maerke=BMW"));
    expect(c.maerke).toBe("BMW");
    expect(canonicalQuery(c)).toBe("?maerke=BMW");
  });
  test("numbers accept Danish thousands separators; bad values fall away", () => {
    const c = parseCriteria(new URLSearchParams("pris_max=300.000&aar_min=abc&side=-2&sort=nope"));
    expect(c.pris_max).toBe(300_000);
    expect(c.aar_min).toBeNull();
    expect(c.side).toBe(1);
    expect(c.sort).toBe("nyeste");
  });
  test("the same criteria in another order canonicalise to one string", () => {
    const a = canonicalQuery(parseCriteria(new URLSearchParams("q=golf&maerke=VW")));
    const b = canonicalQuery(parseCriteria(new URLSearchParams("maerke=VW&q=golf")));
    expect(a).toBe(b);
  });
});

describe("filter / sort / search", () => {
  test("filters by make, price, year, km and fuel", () => {
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("maerke=volvo"))).map((v) => v.id)).toEqual(["BB-2"]);
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("pris_max=300000"))).map((v) => v.id)).toEqual(["BB-1"]);
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("aar_min=2019"))).map((v) => v.id)).toEqual(["BB-1", "BB-2"]);
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("km_max=50000"))).map((v) => v.id)).toEqual(["BB-2"]);
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("braendstof=el"))).map((v) => v.id)).toEqual(["BB-2"]);
  });
  test("search folds Danish letters and matches the BB id", () => {
    expect(searchFold("Ærø Blå")).toBe("aeroe blaa");
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("q=aeroe"))).map((v) => v.id)).toEqual(["BB-3"]);
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("q=bb-2"))).map((v) => v.id)).toEqual(["BB-2"]);
    expect(filterVehicles(lager, parseCriteria(new URLSearchParams("q=volvo+2023"))).map((v) => v.id)).toEqual(["BB-2"]);
  });
  test("sorts with unknown values last", () => {
    expect(sortVehicles(lager, "pris_stigende").map((v) => v.id)).toEqual(["BB-1", "BB-2", "BB-3"]);
    expect(sortVehicles(lager, "pris_faldende").map((v) => v.id)).toEqual(["BB-2", "BB-1", "BB-3"]);
    expect(sortVehicles(lager, "km").map((v) => v.id)).toEqual(["BB-2", "BB-1", "BB-3"]);
    expect(sortVehicles(lager, "aar").map((v) => v.id)).toEqual(["BB-2", "BB-1", "BB-3"]);
    expect(sortVehicles(lager, "nyeste").map((v) => v.id)).toEqual(["BB-1", "BB-2", "BB-3"]);
  });
  test("facets count over the full list and models follow the chosen make", () => {
    const f = facets(lager, { maerke: "BMW" });
    expect(f.makes.map((m) => `${m.value}:${m.count}`)).toEqual(["BMW:1", "Citroën:1", "Volvo:1"]);
    expect(f.models.map((m) => m.value)).toEqual(["320d"]);
    expect(f.price).toEqual({ min: 289_900, max: 599_000 });
  });
  test("paginate clamps the page", () => {
    expect(paginate([1, 2, 3, 4, 5], 9, 2)).toMatchObject({ page: 3, pages: 3, items: [5] });
    expect(paginate([], 1, 24)).toMatchObject({ page: 1, pages: 1, items: [] });
  });
  test("applyCriteria does all three", () => {
    const page = applyCriteria(lager, parseCriteria(new URLSearchParams("sort=pris_stigende&side=2")), 2);
    expect(page.items.map((v) => v.id)).toEqual(["BB-3"]);
    expect(page.total).toBe(3);
  });
  test("similar never includes the car itself and prefers the same make", () => {
    const more = [...lager, car({ id: "BB-4", make: "BMW", model: "X1", price: 250_000, created_at: 4 })];
    expect(similar(more, more[0], 2).map((v) => v.id)).toEqual(["BB-4", "BB-2"]);
  });
});
