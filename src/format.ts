import type { PublicVehicle, SpecKey } from "./contract.ts";

/**
 * Danish number and date formatting. `formatPrice(null)` is "Pris efter
 * aftale", the same wording BilBoost itself uses: a car with no price is one
 * you call about, not one that costs nothing.
 */

const dkk = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 });

export const formatNumber = (value: number | null | undefined, decimals = 0): string =>
  value === null || value === undefined ? "—" : new Intl.NumberFormat("da-DK", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);

export const formatDKK = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${dkk.format(value)} kr.`;

export const formatPrice = (value: number | null | undefined): string =>
  value === null || value === undefined || value <= 0 ? "Pris efter aftale" : `${dkk.format(value)} kr.`;

/**
 * The price a Danish dealer must advertise: ONE total including the
 * mandatory delivery costs (prismærkningsreglerne, 1 April 2018). Auto IT
 * prices already are that total (`price_includes_delivery: true`); a typed
 * price is the bare retail price and gets the delivery costs added. `null`
 * when there is no price at all ("Pris efter aftale").
 */
export const advertisedTotal = (
  v: Pick<PublicVehicle, "price" | "delivery_cost" | "price_includes_delivery">,
): number | null => {
  if (v.price === null || v.price <= 0) return null;
  if (v.price_includes_delivery) return v.price;
  return v.price + (v.delivery_cost ?? 0);
};

export const formatKm = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${dkk.format(value)} km`;

export const formatDate = (value: number | Date | null | undefined): string =>
  value === null || value === undefined
    ? "—"
    : new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" }).format(value);

/** The short line under a card title: "2019 · 88.000 km · Diesel". */
export const formatMeta = (v: Pick<PublicVehicle, "year" | "mileage" | "fuel_type">): string =>
  [v.year ? String(v.year) : null, v.mileage !== null ? formatKm(v.mileage) : null, v.fuel_type]
    .filter((x): x is string => !!x)
    .join(" · ");

export const vehicleTitle = (v: Pick<PublicVehicle, "make" | "model" | "variant">): string =>
  [v.make, v.model, v.variant].filter(Boolean).join(" ");

export const statusBadge = (v: Pick<PublicVehicle, "status">): { label: string; key: "reserveret" } | null =>
  v.status === "reserveret" ? { label: "Reserveret", key: "reserveret" } : null;

export const SPEC_LABELS: Record<SpecKey, { label: string; unit: string; decimals?: number }> = {
  horsepower: { label: "Effekt", unit: "hk" },
  torque: { label: "Moment", unit: "Nm" },
  acceleration: { label: "0-100 km/t", unit: "sek.", decimals: 1 },
  top_speed: { label: "Tophastighed", unit: "km/t" },
  weight: { label: "Vægt", unit: "kg" },
  payload: { label: "Lasteevne", unit: "kg" },
  length_cm: { label: "Længde", unit: "cm" },
  width_cm: { label: "Bredde", unit: "cm" },
  height_cm: { label: "Højde", unit: "cm" },
  trunk_liters: { label: "Bagagerum", unit: "liter" },
  battery_capacity: { label: "Batteri", unit: "kWh", decimals: 1 },
  range_wltp: { label: "Rækkevidde (WLTP)", unit: "km" },
  energy_consumption: { label: "Forbrug", unit: "Wh/km" },
  ac_charging: { label: "AC-opladning", unit: "kW", decimals: 1 },
  dc_charging: { label: "DC-opladning", unit: "kW" },
};

export const formatSpec = (key: SpecKey, value: number | null): string => {
  if (value === null || value === 0) return "—";
  const { unit, decimals = 0 } = SPEC_LABELS[key];
  return `${formatNumber(value, decimals)} ${unit}`;
};

/** Facts worth a row on the detail page, in display order. Empty ones are dropped. */
export const vehicleFacts = (v: PublicVehicle): { label: string; value: string }[] => {
  const rows: { label: string; value: string }[] = [
    { label: "Årgang", value: v.year ? String(v.year) : "—" },
    { label: "Kilometer", value: formatKm(v.mileage) },
    { label: "Brændstof", value: v.fuel_type ?? "—" },
    { label: "Farve", value: v.color ?? "—" },
    { label: "Leveringsomkostninger", value: formatDKK(v.delivery_cost) },
    { label: "Grøn ejerafgift", value: v.green_tax ? `${formatNumber(v.green_tax)} kr./år` : "—" },
  ];
  for (const key of Object.keys(SPEC_LABELS) as SpecKey[]) {
    const value = formatSpec(key, v.specs[key]);
    if (value !== "—") rows.push({ label: SPEC_LABELS[key].label, value });
  }
  return rows.filter((r) => r.value !== "—");
};
