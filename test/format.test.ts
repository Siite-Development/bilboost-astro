import { describe, expect, test } from "vitest";
import fixture from "../fixtures/public-vehicle.json";
import type { PublicVehicle } from "../src/contract.ts";
import { formatKm, formatMeta, formatPrice, formatSpec, statusBadge, vehicleFacts, vehicleTitle } from "../src/format.ts";

const v = fixture.vehicle as PublicVehicle;
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("format", () => {
  test("prices are Danish, and no price is 'Pris efter aftale'", () => {
    expect(nbsp(formatPrice(289_900))).toBe("289.900 kr.");
    expect(formatPrice(null)).toBe("Pris efter aftale");
    expect(formatPrice(0)).toBe("Pris efter aftale");
  });
  test("km and meta line", () => {
    expect(nbsp(formatKm(88_000))).toBe("88.000 km");
    expect(nbsp(formatMeta(v))).toBe("2019 · 88.000 km · Diesel");
    expect(formatMeta({ year: null, mileage: null, fuel_type: null })).toBe("");
  });
  test("title and badge", () => {
    expect(vehicleTitle(v)).toBe("BMW 320d Touring Aut.");
    expect(statusBadge({ status: "reserveret" })).toEqual({ label: "Reserveret", key: "reserveret" });
    expect(statusBadge({ status: "paa_lager" })).toBeNull();
  });
  test("specs with units, zero treated as unknown", () => {
    expect(nbsp(formatSpec("acceleration", 7.1))).toBe("7,1 sek.");
    expect(formatSpec("range_wltp", 0)).toBe("—");
    const facts = vehicleFacts(v);
    expect(facts.map((f) => f.label)).toContain("Effekt");
    expect(facts.map((f) => f.label)).not.toContain("Rækkevidde (WLTP)");
  });
});
