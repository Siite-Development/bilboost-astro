import { describe, expect, test, vi } from "vitest";
import fixture from "../fixtures/public-vehicle.json";
import { applyCache, CACHE_PROFILES, markUnavailable } from "../src/cache.ts";
import type { PublicVehicle } from "../src/contract.ts";
import { listJsonLd, serializeJsonLd, vehicleJsonLd } from "../src/jsonld.ts";
import { imageAttrs, SIZES } from "../src/images.ts";
import { mergeLabels, t } from "../src/labels.da.ts";

const v = fixture.vehicle as PublicVehicle;
const ctx = { siteUrl: "https://demo-biler.dk", basePath: "/bilsalg", dealer: { name: "Demo Biler", phone: "12345678", email: null, address: null, cvr: null } };

describe("jsonld", () => {
  test("Car with Offer, seller, and the canonical URL", () => {
    const data = vehicleJsonLd(v, ctx) as Record<string, any>;
    expect(data["@type"]).toBe("Car");
    expect(data.url).toBe("https://demo-biler.dk/bilsalg/bmw-320d-touring-aut-2019-bb-12/");
    expect(data.offers.price).toBe(289_900);
    expect(data.offers.availability).toBe("https://schema.org/InStock");
    expect(data.offers.seller.name).toBe("Demo Biler");
    expect(data.mileageFromOdometer.value).toBe(88_000);
  });
  test("reserved is LimitedAvailability and no price means no price field", () => {
    const data = vehicleJsonLd({ ...v, status: "reserveret", price: null }, ctx) as Record<string, any>;
    expect(data.offers.availability).toBe("https://schema.org/LimitedAvailability");
    expect("price" in data.offers).toBe(false);
  });
  test("ItemList and script-safe serialisation", () => {
    const list = listJsonLd([v], { ...ctx, name: "Biler" }) as Record<string, any>;
    expect(list.itemListElement[0].position).toBe(1);
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});

describe("applyCache", () => {
  const opts = { devsiteHosts: [".workers.dev"], cacheOnDevsite: false };
  test("sets the profile plus the hint on a production host", () => {
    const set = vi.fn();
    applyCache({ cache: { enabled: true, set }, url: new URL("https://demo-biler.dk/bilsalg/") }, "list", opts, { tags: ["x"] });
    expect(set).toHaveBeenCalledWith({ ...CACHE_PROFILES.list, tags: ["x"] });
  });
  test("opts out on a devsite host, and does nothing when caching is off", () => {
    const set = vi.fn();
    applyCache({ cache: { enabled: true, set }, url: new URL("https://demo.siite.workers.dev/bilsalg/") }, "list", opts);
    expect(set).toHaveBeenCalledWith(false);
    const off = vi.fn();
    applyCache({ cache: { enabled: false, set: off }, url: new URL("https://demo-biler.dk/") }, "list", opts);
    expect(off).not.toHaveBeenCalled();
  });
  test("markUnavailable is a 503 that is never stored", () => {
    const set = vi.fn();
    const response = { headers: new Headers(), status: 200 };
    markUnavailable({ cache: { enabled: true, set }, url: new URL("https://demo-biler.dk/"), response });
    expect(set).toHaveBeenCalledWith(false);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("images and labels", () => {
  test("srcset over every variant, 4:3 frame, nearest width at or above the preferred", () => {
    const a = imageAttrs(v.images[0], SIZES.card, 500);
    expect(a.width).toBe(640);
    expect(a.height).toBe(480);
    expect(a.srcset.split(", ")).toHaveLength(3);
  });
  test("label templates and overrides", () => {
    expect(t("Trin {n} af {m}", { n: 2, m: 3 })).toBe("Trin 2 af 3");
    const labels = mergeLabels({ list: { heading: "Brugte biler" } });
    expect(labels.list.heading).toBe("Brugte biler");
    expect(labels.list.empty).toBe("Ingen biler matcher dine valg.");
  });
});
