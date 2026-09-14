import type { PublicDealer, PublicVehicle } from "./contract.ts";
import { advertisedTotal, vehicleTitle } from "./format.ts";
import { canonicalPath } from "./slug.ts";

/**
 * schema.org markup for search engines. A `Car` with an `Offer` on the detail
 * page, an `ItemList` on the list. Only fields the contract actually has;
 * nothing is invented for the sake of a richer snippet.
 */

type Json = Record<string, unknown>;

const seller = (dealer: PublicDealer | null, siteUrl: string): Json | undefined =>
  dealer
    ? {
        "@type": "AutoDealer",
        name: dealer.name,
        url: siteUrl,
        ...(dealer.phone ? { telephone: dealer.phone } : {}),
        ...(dealer.address ? { address: dealer.address } : {}),
      }
    : undefined;

export const vehicleJsonLd = (
  v: PublicVehicle,
  ctx: { siteUrl: string; basePath: string; dealer: PublicDealer | null },
): Json => {
  const url = `${ctx.siteUrl}${canonicalPath(ctx.basePath, v)}`;
  const largest = (i: PublicVehicle["images"][number]) => i.variants[i.variants.length - 1]?.url;
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicleTitle(v),
    url,
    sku: v.id,
    brand: { "@type": "Brand", name: v.make },
    model: v.model,
    ...(v.variant ? { vehicleConfiguration: v.variant } : {}),
    ...(v.year ? { vehicleModelDate: String(v.year) } : {}),
    ...(v.mileage !== null
      ? { mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileage, unitCode: "KMT" } }
      : {}),
    ...(v.fuel_type ? { fuelType: v.fuel_type } : {}),
    ...(v.color ? { color: v.color } : {}),
    ...(v.description ? { description: v.description } : {}),
    image: v.images.map(largest).filter(Boolean),
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "DKK",
      ...(advertisedTotal(v) !== null ? { price: advertisedTotal(v) } : {}),
      availability: v.status === "reserveret" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
      ...(seller(ctx.dealer, ctx.siteUrl) ? { seller: seller(ctx.dealer, ctx.siteUrl) } : {}),
    },
  };
};

export const listJsonLd = (
  vehicles: PublicVehicle[],
  ctx: { siteUrl: string; basePath: string; name: string },
): Json => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: ctx.name,
  numberOfItems: vehicles.length,
  itemListElement: vehicles.map((v, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${ctx.siteUrl}${canonicalPath(ctx.basePath, v)}`,
    name: vehicleTitle(v),
  })),
});

/** Serialised for a `<script type="application/ld+json">`; `<` is escaped so a description cannot close the tag. */
export const serializeJsonLd = (data: Json): string => JSON.stringify(data).replace(/</g, "\\u003c");
