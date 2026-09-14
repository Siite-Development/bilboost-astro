import { describe, expect, test } from "vitest";
import { isDevsiteHost, resolveOptions } from "../src/options.ts";
import { canonicalPath, parseSlug } from "../src/slug.ts";
import { MAX_IDS_PER_PUSH, tagsFor, tagsForPush } from "../src/tags.ts";

describe("slug", () => {
  test("extracts the BB id from any slug shape", () => {
    expect(parseSlug("bmw-320d-touring-2019-bb-12")).toBe("BB-12");
    expect(parseSlug("bb-7/")).toBe("BB-7");
    expect(parseSlug("BB-3")).toBe("BB-3");
    expect(parseSlug("bmw-320d")).toBeNull();
    expect(parseSlug("bb-12-x")).toBeNull();
  });
  test("canonical path is basePath + slug + trailing slash", () => {
    expect(canonicalPath("/bilsalg", { slug: "bmw-bb-1" })).toBe("/bilsalg/bmw-bb-1/");
  });
});

describe("tags", () => {
  test("names are lowercase and scoped by site key", () => {
    const t = tagsFor("monzes-auto");
    expect(t.all).toBe("bb:monzes-auto");
    expect(t.list).toBe("bb:monzes-auto:list");
    expect(t.car("BB-12")).toBe("bb:monzes-auto:car:bb-12");
  });
  test("a push purges list + cars, or everything past the cap", () => {
    expect(tagsForPush("k", "cars", ["BB-1", "BB-2"])).toEqual(["bb:k:list", "bb:k:car:bb-1", "bb:k:car:bb-2"]);
    expect(tagsForPush("k", "all", [])).toEqual(["bb:k"]);
    expect(tagsForPush("k", "cars", Array.from({ length: MAX_IDS_PER_PUSH + 1 }, (_, i) => `BB-${i}`))).toEqual(["bb:k"]);
  });
});

describe("options", () => {
  test("normalises basePath and siteUrl, rejects bad keys", () => {
    const o = resolveOptions({ siteKey: "monzes-auto", basePath: "bilsalg/", siteUrl: "https://monzesauto.dk/x" });
    expect(o.basePath).toBe("/bilsalg");
    expect(o.siteUrl).toBe("https://monzesauto.dk");
    expect(o.pageSize).toBe(24);
    expect(() => resolveOptions({ siteKey: "Bad Key", basePath: "/b", siteUrl: "https://x.dk" })).toThrow();
    expect(() => resolveOptions({ siteKey: "ok-key", basePath: "/", siteUrl: "https://x.dk" })).toThrow();
  });
  test("devsite hosts", () => {
    const o = resolveOptions({ siteKey: "ok-key", basePath: "/b", siteUrl: "https://x.dk" });
    expect(isDevsiteHost("monzes-auto.siite.workers.dev", o)).toBe(true);
    expect(isDevsiteHost("localhost", o)).toBe(true);
    expect(isDevsiteHost("monzesauto.dk", o)).toBe(false);
  });
});
