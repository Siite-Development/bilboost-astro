import { defineLiveCollection } from "astro:content";
import { bilboostLoader } from "bilboost-astro/loader";

/** The dealer's cars, fetched from BilBoost at request time. */
const biler = defineLiveCollection({ loader: bilboostLoader() });

export const collections = { biler };
