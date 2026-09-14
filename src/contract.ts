/**
 * The public contract between BilBoost and a dealer's site, version 1.
 *
 * Mirror of `convex/lib/publicVehicle.ts` in the BilBoost repo. Both sides
 * pin `fixtures/public-vehicle.json`. Changes are additive only; anything
 * breaking is `/public/v2` and a new major of this package.
 */

export const CONTRACT_VERSION = 1 as const;

export type PublicStatus = "paa_lager" | "reserveret";

export const SPEC_KEYS = [
  "horsepower",
  "torque",
  "acceleration",
  "top_speed",
  "weight",
  "payload",
  "length_cm",
  "width_cm",
  "height_cm",
  "trunk_liters",
  "battery_capacity",
  "range_wltp",
  "energy_consumption",
  "ac_charging",
  "dc_charging",
] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];

export type ImageVariant = { width: number; url: string };
export type PublicImage = { alt: string; variants: ImageVariant[] };

export type PublicVehicle = {
  id: string;
  slug: string;
  status: PublicStatus;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  mileage: number | null;
  color: string | null;
  fuel_type: string | null;
  price: number | null;
  delivery_cost: number | null;
  green_tax: number | null;
  description: string | null;
  equipment: string[];
  images: PublicImage[];
  specs: Record<SpecKey, number | null>;
  created_at: number;
  updated_at: number;
};

export type PublicDealer = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cvr: string | null;
};

export type VehicleListResponse = {
  v: typeof CONTRACT_VERSION;
  site_key: string;
  published: boolean;
  generated_at: number;
  dealer: PublicDealer;
  vehicles: PublicVehicle[];
};

export type VehicleResponse = { v: typeof CONTRACT_VERSION; vehicle: PublicVehicle };

export type SoldStub = Pick<PublicVehicle, "id" | "slug" | "make" | "model" | "variant" | "year">;

export type HealthResponse = {
  ok: boolean;
  published: boolean;
  vehicle_count: number;
  last_vehicle_update_at: number | null;
  token: "current" | "next";
};

/** Body BilBoost POSTs to `/api/bilboost/revalidate`. */
export type PushBody = {
  v: 1;
  type: "vehicles.changed";
  site_key: string;
  seq: number;
  sent_at: number;
  scope: "cars" | "all";
  vehicle_ids: string[];
  dry_run: boolean;
};

export const INQUIRY_TOPICS = ["proevetur", "spoergsmaal", "byttebil", "finansiering"] as const;
export type InquiryTopic = (typeof INQUIRY_TOPICS)[number];

/** What the car-page form posts to `/public/v1/sites/{key}/inquiries`. */
export type InquiryBody = {
  submission_id: string;
  vehicle_id: string;
  topic: InquiryTopic;
  name: string;
  phone: string;
  email: string;
  message: string;
  trade_in: string;
  page_url: string;
  turnstile_token: string;
  bb_website: string;
};
