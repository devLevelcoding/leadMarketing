#!/usr/bin/env tsx
/**
 * Visits each phase-3 lead's website and detects WhatsApp links (wa.me / api.whatsapp.com).
 * Updates hasWhatsapp=true + phone number when found, then re-tags phase 32.
 * Run after import-leads.ts has completed.
 *
 * Usage: npx tsx scripts/scan-whatsapp.ts
 *        npx tsx scripts/scan-whatsapp.ts --phase 3   (default)
 *        npx tsx scripts/scan-whatsapp.ts --rescan     (re-check already-scanned leads too)
 */
import { PrismaClient } from "@prisma/client";
import { chromium, Browser, BrowserContext, Page } from "playwright";

const prisma = new PrismaClient();

const args      = process.argv.slice(2);
const PHASE     = parseInt(args[args.indexOf("--phase") + 1] ?? "3") || 3;
const RESCAN    = args.includes("--rescan");
const CONCURRENCY    = 4;   // parallel browser tabs
const PAGE_TIMEOUT   = 9000; // ms per page load
const DELAY_BETWEEN  = 150;  // ms between tab launches

// ─── Regex patterns ───────────────────────────────────────────────────────────

const WA_HREF_RE   = /(?:wa\.me|api\.whatsapp\.com\/send|whatsapp\.com\/send)[/?](?:phone=)?(\+?[\d]{7,15})/i;
const WA_SOURCE_RE = /(?:wa\.me|api\.whatsapp\.com\/send|whatsapp\.com\/send)[/?](?:phone=)?(\+?[\d]{7,15})/gi;

function extractNumber(raw: string): string | null {
  const m = raw.match(/(\+?[\d]{7,15})/);
  return m ? ("+" + m[1].replace(/^\+/, "")) : null;
}

async function detectWA(page: Page, url: string): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });

    // 1. Check all anchor hrefs
    const hrefs = await page.$$eval('a[href]', els =>
      els.map(e => (e as HTMLAnchorElement).href).filter(h => h)
    ).catch(() => [] as string[]);

    for (const href of hrefs) {
      const m = href.match(WA_HREF_RE);
      if (m) return extractNumber(m[1]);
    }

    // 2. Check page source (catches JS-injected onclick / data attributes)
    const html = await page.content().catch(() => "");
    const matches = [...html.matchAll(WA_SOURCE_RE)];
    if (matches.length > 0) {
      return extractNumber(matches[0][1]);
    }

    return null;
  } catch {
    return null; // timeout, nav error, etc.
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function bar(done: number, total: number, width = 30): string {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const where = RESCAN
    ? { phase: PHASE, website: { not: null } }
    : { phase: PHASE, website: { not: null }, hasWhatsapp: false };

  const leads = await prisma.lead.findMany({ where, select: { id: true, name: true, website: true } });

  console.log(`\n🔍 WhatsApp scanner — Phase ${PHASE}`);
  console.log(`   ${leads.length} leads to scan${RESCAN ? " (rescan mode)" : " (skipping already-confirmed)"}`);
  console.log(`   Concurrency: ${CONCURRENCY} | Timeout: ${PAGE_TIMEOUT}ms\n`);

  if (leads.length === 0) {
    console.log("Nothing to scan. Run import-leads.ts first.");
    return;
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });

  let done    = 0;
  let found   = 0;
  let errors  = 0;
  const startMs = Date.now();
  const queue   = [...leads];

  async function worker() {
    while (queue.length > 0) {
      const lead = queue.shift()!;
      const page = await context.newPage();
      try {
        const waNumber = await detectWA(page, lead.website!);
        if (waNumber) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { hasWhatsapp: true, phone: waNumber },
          });
          found++;
        }
      } catch {
        errors++;
      } finally {
        await page.close().catch(() => {});
        done++;
        process.stdout.write(`\r  ${bar(done, leads.length, 30)} ${eta(startMs, done, leads.length)}  found: ${found}  `);
        await new Promise(r => setTimeout(r, DELAY_BETWEEN));
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  await browser.close();
  console.log(`\n\n✅ Scan complete`);
  console.log(`   Scanned : ${done}`);
  console.log(`   Found WA: ${found}`);
  console.log(`   Errors  : ${errors}`);

  // Re-tag phase 32
  console.log(`\n🏷  Re-tagging Phase 32 (WA + Website)...`);
  const reset = await prisma.lead.updateMany({ where: { phase: 32 }, data: { phase: PHASE } });
  if (reset.count > 0) console.log(`   ↩  Reset ${reset.count} existing phase-32 leads → phase ${PHASE}`);

  const promoted = await prisma.lead.updateMany({
    where: { phase: PHASE, hasWhatsapp: true, website: { not: null }, phone: { not: null } },
    data: { phase: 32 },
  });

  const total3  = await prisma.lead.count({ where: { phase: PHASE } });
  const total32 = await prisma.lead.count({ where: { phase: 32 } });

  console.log(`   ✅ Promoted ${promoted.count} leads → Phase 32 (WA + Website)`);
  console.log(`\n   Phase ${PHASE}  (USA all)          : ${total3}`);
  console.log(`   Phase 32 (USA WA + Website) : ${total32}`);
  console.log(`\nDone. Phase 32 leads are ready for WhatsApp campaign.\n`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
