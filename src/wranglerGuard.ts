import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * A Cloudflare git build runs `wrangler deploy`, and wrangler treats the
 * config file as the whole truth: every plain-text variable set in the
 * dashboard that is not under `[vars]` is deleted. On 15 Sep 2026 that took
 * Monzes Auto's BilBoost keys, and every car page answered 500.
 *
 * `keep_vars = true` stops it, on every machine and in Cloudflare's own build,
 * because it lives in the repo. The integration fails `astro build` without it
 * and warns in dev. The keys should still be added as type Secret.
 */

export type KeepVarsCheck =
  | { ok: true; file: string }
  | { ok: false; file: string | null; reason: string };

const CONFIG_FILES = ["wrangler.toml", "wrangler.jsonc", "wrangler.json"] as const;

/** Top-level `keep_vars = true` in TOML: before the first `[table]`. */
const tomlKeepsVars = (src: string): boolean => {
  const lines = src.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line.startsWith("[")) return false;
    if (/^keep_vars\s*=\s*true$/.test(line)) return true;
  }
  return false;
};

/** `"keep_vars": true` in JSON or JSONC, with comments stripped first. */
const jsonKeepsVars = (src: string): boolean => {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/.*$/gm, "$1");
  return /"keep_vars"\s*:\s*true\b/.test(noComments);
};

export const checkKeepVars = (root: URL | string): KeepVarsCheck => {
  const dir = typeof root === "string" ? root : fileURLToPath(root);
  const found = CONFIG_FILES.map((name) => join(dir, name)).find((path) => existsSync(path));
  if (!found) {
    return { ok: false, file: null, reason: "fandt ingen wrangler.toml, wrangler.jsonc eller wrangler.json i sitets rod" };
  }
  const src = readFileSync(found, "utf8");
  const keeps = found.endsWith(".toml") ? tomlKeepsVars(src) : jsonKeepsVars(src);
  return keeps
    ? { ok: true, file: found }
    : { ok: false, file: found, reason: `keep_vars = true mangler i ${found.split("/").pop()}` };
};

export const KEEP_VARS_HELP =
  "Tilføj `keep_vars = true` øverst i wrangler.toml (før første [sektion]). " +
  "Uden den sletter hvert git-build de BilBoost-nøgler der er sat i Cloudflare-dashboardet, og bilsiderne svarer 500. " +
  "Nøglerne skal desuden have typen Secret. Se README, afsnittet om secrets.";
