#!/usr/bin/env node
/**
 * bilboost-astro — small checks against a RUNNING site, because the house
 * gates read `dist/` and never see a server-rendered car page.
 *
 *   bilboost-astro check <site-url> [--base /bilsalg]
 *   bilboost-astro sign-test <site-url> --secret <s> [--site-key k] [--dry-run] [--ids BB-1,BB-2]
 */
import { createHmac } from "node:crypto";

const args = process.argv.slice(2);
const cmd = args.shift();
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
};
const has = (name) => args.includes(`--${name}`);

const fail = (msg) => {
  console.error(`✖ ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": "bilboost-astro-check/1" } });
  return { res, text: await res.text() };
};

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
};

const checkPage = async (url, kind) => {
  const { res, text } = await fetchText(url);
  console.log(`\n${kind}: ${url} → ${res.status}`);
  if (res.status !== 200) return fail(`${kind} answered ${res.status}`);

  const h1s = (text.match(/<h1[\s>]/gi) ?? []).length;
  h1s === 1 ? ok("one h1") : fail(`${h1s} h1 elements`);

  const canonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.exec(text)?.[0];
  canonical ? ok(`canonical ${attr(canonical, "href")}`) : fail("no canonical");

  const imgs = text.match(/<img[^>]*>/gi) ?? [];
  let badImgs = 0;
  for (const img of imgs) {
    const src = attr(img, "src") ?? "";
    if (!src || src === "") continue;
    if (!attr(img, "width") || !attr(img, "height") || !attr(img, "loading") || !attr(img, "alt") === null) badImgs += 1;
  }
  badImgs === 0 ? ok(`${imgs.length} images carry width/height/loading`) : fail(`${badImgs} images lack width/height/loading`);

  const ld = text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!ld) fail("no JSON-LD");
  else {
    try {
      const data = JSON.parse(ld[1]);
      ok(`JSON-LD ${data["@type"]}`);
    } catch {
      fail("JSON-LD does not parse");
    }
  }

  for (const forbidden of ["external_raw", "license_plate"]) {
    text.includes(forbidden) ? fail(`page contains "${forbidden}"`) : ok(`no "${forbidden}"`);
  }
  if (/[—–]/.test(text.replace(/<script[\s\S]*?<\/script>/g, ""))) fail("long dash in copy (house rule)");
  else ok("no long dashes");

  if (kind === "list") {
    /data-bb="listing"/.test(text) ? ok("listing hook") : fail('no [data-bb="listing"]');
    /data-bb="card"/.test(text) ? ok("card hooks") : fail('no [data-bb="card"]');
    /data-bb="filters"/.test(text) ? ok("filters form") : fail('no [data-bb="filters"]');
  } else {
    /data-bb="inquiry"/.test(text) ? ok("inquiry form") : fail('no [data-bb="inquiry"]');
    /data-bb="gallery"/.test(text) ? ok("gallery") : fail('no [data-bb="gallery"]');
    const cc = res.headers.get("cache-control");
    const cf = res.headers.get("cf-cache-status");
    console.log(`  cache-control: ${cc ?? "-"}  cf-cache-status: ${cf ?? "-"}`);
  }
  return text;
};

const check = async () => {
  const site = args[0];
  if (!site) throw new Error("usage: bilboost-astro check <site-url> [--base /bilsalg]");
  const base = flag("base", "/bilsalg").replace(/\/+$/, "");
  const origin = new URL(site).origin;
  const list = await checkPage(`${origin}${base}/`, "list");
  if (!list) return;
  const first = new RegExp(`href="(${base.replace(/[/]/g, "\\/")}\\/[a-z0-9-]+-bb-\\d+\\/)"`, "i").exec(list)?.[1];
  if (!first) return fail("no car link on the list page");
  await checkPage(`${origin}${first}`, "detail");

  const { res: health, text } = await fetchText(`${origin}/api/bilboost/health`);
  console.log(`\nhealth: ${health.status} ${text.slice(0, 200)}`);
  health.status === 200 ? ok("health") : fail("health not 200");
  const { res: sm } = await fetchText(`${origin}/sitemap-biler.xml`);
  sm.status === 200 ? ok("sitemap-biler.xml") : fail(`sitemap-biler.xml ${sm.status}`);
};

const signTest = async () => {
  const site = args[0];
  const secret = flag("secret");
  if (!site || !secret) throw new Error("usage: bilboost-astro sign-test <site-url> --secret <s> [--site-key k] [--dry-run] [--ids BB-1,BB-2]");
  const ids = (flag("ids", "") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = JSON.stringify({
    v: 1,
    type: "vehicles.changed",
    site_key: flag("site-key", "demo-biler"),
    seq: Date.now(),
    sent_at: Date.now(),
    scope: ids.length ? "cars" : "all",
    vehicle_ids: ids,
    dry_run: has("dry-run"),
  });
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const res = await fetch(`${new URL(site).origin}/api/bilboost/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "BilBoost-Signature": `t=${t},v1=${v1}` },
    body,
  });
  console.log(res.status, await res.text());
  if (!res.ok) process.exitCode = 1;
};

try {
  if (cmd === "check") await check();
  else if (cmd === "sign-test") await signTest();
  else {
    console.log("usage:\n  bilboost-astro check <site-url> [--base /bilsalg]\n  bilboost-astro sign-test <site-url> --secret <s> [--site-key k] [--dry-run] [--ids BB-1,BB-2]");
    process.exitCode = 2;
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
