import { describe, expect, test } from "vitest";
import fixture from "../fixtures/public-vehicle.json";
import { SPEC_KEYS, type PublicVehicle } from "../src/contract.ts";

/** The fixture is shared with BilBoost; if the shape drifts, one of the two repos goes red. */
describe("contract v1", () => {
  test("the fixture has exactly the PublicVehicle keys", () => {
    const v = fixture.vehicle as PublicVehicle;
    expect(Object.keys(v)).toEqual([
      "id", "slug", "status", "make", "model", "variant", "year", "mileage", "color", "fuel_type",
      "price", "delivery_cost", "green_tax", "description", "equipment", "images", "specs", "created_at", "updated_at",
    ]);
    expect(Object.keys(v.specs)).toEqual([...SPEC_KEYS]);
    expect(v.slug.endsWith("-bb-12")).toBe(true);
  });
});
