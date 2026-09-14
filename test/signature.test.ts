import { describe, expect, test } from "vitest";
import vectors from "../fixtures/signature-vectors.json";
import { signBody, verifySignature } from "../src/signature.ts";

/** Same vectors as `convex/lib/siteSignature.test.ts` in BilBoost. */
describe("signature", () => {
  test.each(vectors.cases)("vector: $name", async (c) => {
    expect(await signBody(c.secret, c.body, c.t)).toBe(c.header);
    expect((await verifySignature([c.secret], c.body, c.header, c.now)).ok).toBe(c.valid);
  });
  test("accepts the rotated-in secret and says which matched", async () => {
    const header = await signBody("next", "{}", 1_700_000_000);
    expect(await verifySignature(["old", "next"], "{}", header, 1_700_000_000)).toEqual({ ok: true, secretIndex: 1 });
  });
  test("rejects garbage and a wrong secret", async () => {
    expect((await verifySignature(["s"], "{}", "t=1,v1=zz", 1)).ok).toBe(false);
    expect((await verifySignature(["s"], "{}", null, 1)).ok).toBe(false);
    const header = await signBody("other", "{}", 1_700_000_000);
    expect((await verifySignature(["s"], "{}", header, 1_700_000_000)).ok).toBe(false);
  });
});
