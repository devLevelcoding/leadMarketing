#!/usr/bin/env tsx
/**
 * Instagram page scraper for Phase 6 Education leads.
 *
 * Strategy per lead (website visit):
 *   1. Visit the lead's website homepage
 *   2. Scan all <a href> for instagram.com profile links
 *   3. If not found, try /contact page (common location for social links)
 *   4. Filter out non-profile URLs (posts, reels, stories, tags)
 *   5. Save best match to Lead.instagramUrl in DB
 *
 * Usage:
 *   npx tsx scripts/scrape-instagram.ts
 *   npx tsx scripts/scrape-instagram.ts --country Germany
 *   npx tsx scripts/scrape-instagram.ts --country Germany --visible
 *   npx tsx scripts/scrape-instagram.ts --limit 50
 *   npx tsx scripts/scrape-instagram.ts --refetch   (re-check leads already scanned)
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Config ───────────────────────────────────────────────────────────────────

const TIMEOUT_MS        = 10_000;  // per page load
const DELAY_BETWEEN_MS  = 600;
const CONTACT_PATHS     = ["/contact", "/contact-us", "/kontakt", "/sobre", "/about", "/social-media", "/follow-us"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bar(done: number, total: number, width = 28): string {
  const pct  = total > 0 ? done / total : 0;
  const fill = Math.round(pct * width);
  return `[${"█".repeat(fill)}${"░".repeat(width - fill)}] ${done}/${total} (${Math.round(pct * 100)}%)`;
}

function eta(startMs: number, done: number, total: number): string {
  if (done === 0) return "ETA --:--";
  const elapsed = (Date.now() - startMs) / 1000;
  const secLeft = Math.round((elapsed / done) * (total - done));
  const m = Math.floor(secLeft / 60);
  const s = secLeft % 60;
  return `ETA ${m}m${s.toString().padStart(2, "0")}s`;
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/** Extract Instagram profile URLs from all anchors on a page. */
async function extractInstagramLinks(page: Page): Promise<string[]> {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map(a => (a as HTMLAnchorElement).href)
  );

  const seen = new Set<string>();
  const results: string[] = [];

  for (const raw of hrefs) {
    try {
      const url = new URL(raw);
      if (!url.hostname.includes("instagram.com")) continue;

      // Must have a path beyond just "/"
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts.length === 0) continue;

      // Skip non-profile paths
      const first = parts[0].toLowerCase();
      if (["p", "reel", "reels", "stories", "explore", "tv", "share", "tags", "accounts"].includes(first)) continue;

      // Normalise to https://www.instagram.com/username
      const canonical = `https://www.instagram.com/${parts[0]}/`;
      if (!seen.has(canonical)) {
        seen.add(canonical);
        results.push(canonical);
      }
    } catch { /* ignore malformed href */ }
  }

  return results;
}

/** Visit homepage, then optionally a /contact page if no link found. */
async function findInstagram(page: Page, website: string): Promise<string | null> {
  // Normalise website URL
  const base = website.replace(/\/+$/, "");
  const homeUrl = base.startsWith("http") ? base : `https://${base}`;

  // ── Attempt 1: homepage ───────────────────────────────────────────────────
  try {
    await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    const links = await extractInstagramLinks(page);
    if (links.length > 0) return links[0];
  } catch { /* timeout or DNS failure */ }

  // ── Attempt 2: common contact/social pages ────────────────────────────────
  for (const path of CONTACT_PATHS) {
    try {
      const contactUrl = `${homeUrl}${path}`;
      await page.goto(contactUrl, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
      const links = await extractInstagramLinks(page);
      if (links.length > 0) return links[0];
    } catch { /* skip */ }
  }

  return null;
}

// ─── CSV output ───────────────────────────────────────────────────────────────

const CSV_PATH = join(__dirname, "../../scraper/phase6/instagram_results.csv");
const CSV_HEADER = "id,name,country,website,instagram_url,found_at\n";

function writeRow(row: {
  id: number; name: string; country: string | null;
  website: string | null; instagram_url: string | null; found_at: string;
}) {
  function esc(v: string | null) {
    if (!v) return "";
    const s = v.replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  }
  appendFileSync(CSV_PATH, [row.id, esc(row.name), esc(row.country), esc(row.website), esc(row.instagram_url), row.found_at].join(",") + "\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const filterCountry = args.includes("--country") ? args[args.indexOf("--country") + 1] : null;
  const limitArg      = args.includes("--limit")   ? parseInt(args[args.indexOf("--limit") + 1]) : 99999;
  const headless      = !args.includes("--visible");
  const refetch       = args.includes("--refetch"); // re-check already-scanned leads

  // ── Load leads from DB ────────────────────────────────────────────────────
  const where: Record<string, unknown> = {
    phase: 6,
    website: { not: null },
  };
  if (filterCountry) where.country = filterCountry;
  if (!refetch) where.instagramUrl = null; // only leads not yet scanned

  const leads = await prisma.lead.findMany({
    where,
    select: { id: true, name: true, website: true, country: true },
    orderBy: { country: "asc" },
    take: limitArg,
  });

  if (leads.length === 0) {
    console.log("No leads to scan (all already have Instagram URLs, or none match filters).");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📸 Instagram Scraper — Phase 6 Education`);
  console.log(`   Leads   : ${leads.length}`);
  if (filterCountry) console.log(`   Country : ${filterCountry}`);
  console.log(`   Refetch : ${refetch}\n`);

  // ── Init CSV ──────────────────────────────────────────────────────────────
  if (!existsSync(CSV_PATH) || refetch) {
    writeFileSync(CSV_PATH, CSV_HEADER);
  }

  // ── Launch browser ────────────────────────────────────────────────────────
  const browser: Browser = await chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const context: BrowserContext = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-GB",
    viewport: { width: 1280, height: 900 },
    // Block images/fonts/media for speed
    extraHTTPHeaders: {},
  });

  // Block heavy assets to speed up scraping
  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "media", "font", "stylesheet"].includes(type)) {
      return route.abort();
    }
    return route.continue();
  });

  const page: Page = await context.newPage();

  let found = 0;
  let notFound = 0;
  const startMs = Date.now();
  const foundAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    process.stdout.write(`\r  ${(lead.name ?? "").slice(0, 36).padEnd(36)} ${bar(i, leads.length, 24)} ${eta(startMs, i, leads.length)}  `);

    const instagramUrl = await findInstagram(page, lead.website!);

    if (instagramUrl) {
      found++;
      await prisma.lead.update({
        where: { id: lead.id },
        data: { instagramUrl },
      });
    } else {
      notFound++;
    }

    writeRow({
      id: lead.id,
      name: lead.name,
      country: lead.country,
      website: lead.website,
      instagram_url: instagramUrl,
      found_at: foundAt,
    });

    await delay(DELAY_BETWEEN_MS);
  }

  process.stdout.write("\n");

  await browser.close();
  await prisma.$disconnect();

  const elapsed = Math.round((Date.now() - startMs) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  console.log(`\n✅ Done in ${m}m${s.toString().padStart(2, "0")}s`);
  console.log(`   Found    : ${found} Instagram URLs`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   CSV      : ${CSV_PATH}`);
  console.log(`\nNext: view results at /api/leads or check the CSV`);
}

main().catch(err => { console.error(err); process.exit(1); });
