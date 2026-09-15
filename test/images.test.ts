import { describe, expect, test } from "vitest";
import { imageAttrs, SIZES, thumbWindow } from "../src/images.ts";

describe("thumbWindow", () => {
  test("shows up to the max and counts the rest for the +N", () => {
    expect(thumbWindow(10, 4)).toEqual({ visible: 4, rest: 6 });
    expect(thumbWindow(4, 4)).toEqual({ visible: 4, rest: 0 });
    expect(thumbWindow(2, 4)).toEqual({ visible: 2, rest: 0 });
    expect(thumbWindow(0, 4)).toEqual({ visible: 0, rest: 0 });
  });
  test("a nonsense max still shows one", () => {
    expect(thumbWindow(5, 0)).toEqual({ visible: 1, rest: 4 });
  });
});

const image = {
  alt: "Fiat Punto",
  variants: [
    { width: 1024, url: "https://x/1024" },
    { width: 320, url: "https://x/320" },
    { width: 640, url: "https://x/640" },
  ],
};

describe("imageAttrs", () => {
  test("picks the first variant at or above the preferred width, 4:3 height", () => {
    const a = imageAttrs(image, SIZES.card, 640);
    expect(a.src).toBe("https://x/640");
    expect(a.srcset).toBe("https://x/320 320w, https://x/640 640w, https://x/1024 1024w");
    expect(a.height).toBe(480);
  });

  test("rotate is undefined for an upright photo and a string for a turned one", () => {
    expect(imageAttrs(image, SIZES.card).rotate).toBeUndefined();
    expect(imageAttrs({ ...image, rotation: 90 }, SIZES.card).rotate).toBe("90");
    expect(imageAttrs({ ...image, rotation: 270 }, SIZES.thumb).rotate).toBe("270");
  });
});
