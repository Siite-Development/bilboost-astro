import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fixture from "../fixtures/public-vehicle.json";
import { __setConfigForTests, type RuntimeConfig } from "../src/config.ts";
import { BilboostError, bilboostLoader, getLastDealer } from "../src/loader.ts";

const cfg: RuntimeConfig = {
  siteKey: "demo-biler",
  basePath: "/bilsalg",
  siteUrl: "https://demo-biler.dk",
  similar: false,
  cacheOnDevsite: false,
  pageSize: 24,
  devsiteHosts: [],
  apiBase: "https://x.convex.site",
  readToken: "bbr_x",
  webhookSecrets: [],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => __setConfigForTests(cfg));
afterEach(() => __setConfigForTests(null));

describe("bilboostLoader", () => {
  test("collection: entries keyed by BB id, tags for list and each car, bearer token sent", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://x.convex.site/public/v1/sites/demo-biler/vehicles");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer bbr_x");
      return json({ v: 1, site_key: "demo-biler", published: true, generated_at: 1, dealer: { name: "Demo", phone: "1", email: null, address: null, cvr: null }, vehicles: [fixture.vehicle] });
    });
    const result = await bilboostLoader({ fetchImpl: fetchImpl as never }).loadCollection({ collection: "biler" });
    expect("entries" in result).toBe(true);
    if (!("entries" in result)) return;
    expect(result.entries[0].id).toBe("BB-12");
    expect(result.entries[0].cacheHint?.tags).toEqual(["bb:demo-biler:car:bb-12"]);
    expect(result.cacheHint?.tags).toEqual(["bb:demo-biler", "bb:demo-biler:list"]);
    expect(getLastDealer()?.name).toBe("Demo");
  });

  test("entry: 200 → data + tags; 410 → sold with stub; 404 → not_found; 500 → unavailable", async () => {
    const answers: Record<string, () => Response> = {
      "BB-12": () => json({ v: 1, vehicle: fixture.vehicle }),
      "BB-3": () => json({ error: "sold", vehicle: { id: "BB-3", slug: "x-bb-3", make: "Kia", model: "Ceed", variant: null, year: 2020 } }, 410),
      "BB-9": () => json({ error: "not_found" }, 404),
      "BB-5": () => new Response("", { status: 500 }),
    };
    const fetchImpl = vi.fn(async (url: string) => answers[url.split("/").pop()!]());
    const loader = bilboostLoader({ fetchImpl: fetchImpl as never });
    const load = (id: string) => loader.loadEntry({ filter: { id }, collection: "biler" });

    const ok = await load("bb-12");
    expect(ok && "data" in ok && ok.cacheHint?.tags).toEqual(["bb:demo-biler", "bb:demo-biler:car:bb-12"]);
    const sold = await load("BB-3");
    expect(sold && "error" in sold && sold.error).toBeInstanceOf(BilboostError);
    expect(sold && "error" in sold && sold.error.code).toBe("sold");
    expect(sold && "error" in sold && sold.error.stub?.make).toBe("Kia");
    const missing = await load("BB-9");
    expect(missing && "error" in missing && missing.error.code).toBe("not_found");
    const down = await load("BB-5");
    expect(down && "error" in down && down.error.code).toBe("unavailable");
  });

  test("a network failure is an unavailable error, never a throw", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    const result = await bilboostLoader({ fetchImpl: fetchImpl as never }).loadCollection({ collection: "biler" });
    expect("error" in result && result.error.code).toBe("unavailable");
  });
});
