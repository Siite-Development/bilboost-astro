import type { PublicImage } from "./contract.ts";

/**
 * `srcset`/`sizes` for the variants BilBoost serves. Auto IT photos come in
 * 320/640/1024, uploads in 480/960/1600. The frame is a fixed 4:3 so a card
 * never jumps while its photo loads — Auto IT's photos are 4:3 in practice.
 */

export const IMAGE_RATIO = 4 / 3;

export const SIZES = {
  card: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 92vw",
  hero: "(min-width: 1024px) 62vw, 100vw",
  thumb: "120px",
  lightbox: "min(92vw, 1400px)",
} as const;

export type ImageAttrs = {
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
};

export const imageAttrs = (image: PublicImage, sizes: string, preferredWidth = 640): ImageAttrs => {
  const variants = [...image.variants].sort((a, b) => a.width - b.width);
  const pick = variants.find((v) => v.width >= preferredWidth) ?? variants[variants.length - 1];
  return {
    src: pick.url,
    srcset: variants.map((v) => `${v.url} ${v.width}w`).join(", "),
    sizes,
    width: pick.width,
    height: Math.round(pick.width / IMAGE_RATIO),
    alt: image.alt,
  };
};

export const largestUrl = (image: PublicImage): string =>
  [...image.variants].sort((a, b) => b.width - a.width)[0]?.url ?? "";
