import { describe, expect, test } from "vitest";
import { turnstileState } from "../src/routes/health.ts";

describe("turnstileState", () => {
  test("tells a real site key from Cloudflare's test keys and a missing one", () => {
    expect(turnstileState("0x4AAAAAAABkMYinukE8nzY")).toBe("set");
    expect(turnstileState("1x00000000000000000000AA")).toBe("test");
    expect(turnstileState("3x00000000000000000000FF")).toBe("test");
    expect(turnstileState("")).toBe("missing");
    expect(turnstileState(null)).toBe("missing");
    expect(turnstileState(undefined)).toBe("missing");
  });
});
