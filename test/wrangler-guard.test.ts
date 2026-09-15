import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { checkKeepVars } from "../src/wranglerGuard.ts";

const site = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "bb-wrangler-"));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
};

describe("checkKeepVars", () => {
  test("passes a wrangler.toml with top-level keep_vars = true", () => {
    const dir = site({ "wrangler.toml": 'name = "x"\nkeep_vars = true # keep dashboard keys\n\n[vars]\nA = "1"\n' });
    expect(checkKeepVars(dir).ok).toBe(true);
  });

  test("fails a wrangler.toml without it, the Monzes Auto shape of 15 Sep 2026", () => {
    const dir = site({ "wrangler.toml": 'name = "x"\n\n[vars]\nBILBOOST_API_BASE = "https://example"\n' });
    const result = checkKeepVars(dir);
    expect(result.ok).toBe(false);
  });

  test("does not count keep_vars inside a table, or set to false, or commented out", () => {
    expect(checkKeepVars(site({ "wrangler.toml": 'name = "x"\n[vars]\nkeep_vars = true\n' })).ok).toBe(false);
    expect(checkKeepVars(site({ "wrangler.toml": "keep_vars = false\n" })).ok).toBe(false);
    expect(checkKeepVars(site({ "wrangler.toml": "# keep_vars = true\n" })).ok).toBe(false);
  });

  test("reads wrangler.jsonc with comments and wrangler.json", () => {
    expect(checkKeepVars(site({ "wrangler.jsonc": '{\n  // keep dashboard keys\n  "name": "x",\n  "keep_vars": true\n}\n' })).ok).toBe(true);
    expect(checkKeepVars(site({ "wrangler.jsonc": '{\n  // "keep_vars": true\n  "name": "x"\n}\n' })).ok).toBe(false);
    expect(checkKeepVars(site({ "wrangler.json": '{"name":"x","keep_vars":true}' })).ok).toBe(true);
  });

  test("fails when there is no wrangler config at all", () => {
    const result = checkKeepVars(site({}));
    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.file).toBeNull();
  });
});
