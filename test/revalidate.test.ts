import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { __setConfigForTests, type RuntimeConfig } from "../src/config.ts";
import { __resetPurgeGap, handleRevalidate } from "../src/routes/revalidate.ts";
import { signBody, SIGNATURE_HEADER } from "../src/signature.ts";

const cfg: RuntimeConfig = {
  siteKey: "demo-biler",
  basePath: "/bilsalg",
  siteUrl: "https://demo-biler.dk",
  similar: false,
  cacheOnDevsite: false,
  pageSize: 24,
  devsiteHosts: [".workers.dev"],
  apiBase: "https://x.convex.site",
  readToken: "bbr_x",
  webhookSecrets: ["current-secret", "next-secret"],
};

const push = async (body: Record<string, unknown>, secret = "current-secret", t = Math.floor(Date.now() / 1000)) => {
  const text = JSON.stringify({ v: 1, type: "vehicles.changed", site_key: "demo-biler", seq: 1, sent_at: Date.now(), scope: "cars", vehicle_ids: ["BB-1"], dry_run: false, ...body });
  return new Request("https://demo-biler.dk/api/bilboost/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: await signBody(secret, text, t) },
    body: text,
  });
};

let now = 1_000_000;
beforeEach(() => {
  __setConfigForTests(cfg);
  __resetPurgeGap();
  now = 1_000_000;
});
afterEach(() => __setConfigForTests(null));

describe("POST /api/bilboost/revalidate", () => {
  test("purges list + car tags on a good push and reports the count", async () => {
    const purge = vi.fn(async () => ({ success: true, errors: [] }));
    const res = await handleRevalidate(await push({ vehicle_ids: ["BB-1", "BB-2"] }), { purge, now: () => (now += 10_000) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, purged: true, tags: 3 });
    expect(purge).toHaveBeenCalledWith(["bb:demo-biler:list", "bb:demo-biler:car:bb-1", "bb:demo-biler:car:bb-2"]);
  });

  test("scope all purges the catch-all tag only", async () => {
    const purge = vi.fn(async () => ({ success: true, errors: [] }));
    await handleRevalidate(await push({ scope: "all", vehicle_ids: [] }), { purge, now: () => (now += 10_000) });
    expect(purge).toHaveBeenCalledWith(["bb:demo-biler"]);
  });

  test("dry run verifies without purging and names the secret", async () => {
    const purge = vi.fn();
    const res = await handleRevalidate(await push({ dry_run: true }, "next-secret"), { purge });
    expect(await res.json()).toEqual({ ok: true, dry_run: true, secret: "next" });
    expect(purge).not.toHaveBeenCalled();
  });

  test("bad signature → 401, stale → 401, wrong site key → 409, bad body → 400", async () => {
    expect((await handleRevalidate(await push({}, "wrong"))).status).toBe(401);
    expect((await handleRevalidate(await push({}, "current-secret", Math.floor(Date.now() / 1000) - 400))).status).toBe(401);
    const mismatch = await handleRevalidate(await push({ site_key: "other" }), { purge: vi.fn() });
    expect(mismatch.status).toBe(409);
    expect((await handleRevalidate(await push({ scope: "nope" }), { purge: vi.fn() })).status).toBe(400);
  });

  test("a rate-limited purge answers 429 with Retry-After; another failure 502", async () => {
    const limited = vi.fn(async () => ({ success: false, errors: [{ message: "rate limit exceeded" }] }));
    const res = await handleRevalidate(await push({}), { purge: limited, now: () => (now += 10_000) });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    const broken = vi.fn(async () => ({ success: false, errors: [{ message: "boom" }] }));
    expect((await handleRevalidate(await push({}), { purge: broken, now: () => (now += 10_000) })).status).toBe(502);
  });

  test("no cloudflare:workers (local dev) is cache_disabled, not an error", async () => {
    const purge = vi.fn(async () => {
      throw new Error("No such module cloudflare:workers");
    });
    const res = await handleRevalidate(await push({}), { purge, now: () => (now += 10_000) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, purged: false, reason: "cache_disabled" });
  });

  test("two purges inside two seconds: the second is throttled with 503", async () => {
    const purge = vi.fn(async () => ({ success: true, errors: [] }));
    expect((await handleRevalidate(await push({}), { purge, now: () => now })).status).toBe(200);
    const second = await handleRevalidate(await push({ seq: 2 }), { purge, now: () => now + 500 });
    expect(second.status).toBe(503);
    expect(purge).toHaveBeenCalledTimes(1);
  });
});
