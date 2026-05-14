#!/usr/bin/env tsx
/**
 * Repairs CSVs where the name field is "Results" by extracting
 * the business name from the maps_url field.
 *
 * Usage: npx tsx scripts/fix-csv-names.ts
 */

import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const SCRAPER_DIR = path.join(__dirname, "../../scraper");

function nameFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const m = url.match(/\/place\/([^/@?#]+)/);
    if (!m) return null;
    return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
  } catch {
    return null;
  }
}

function repairCsv(filePath: string): { fixed: number; total: number } {
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

  let fixed = 0;
  for (const row of rows) {
    if (row.name === "Results" || !row.name) {
      const extracted = nameFromUrl(row.maps_url);
      if (extracted) {
        row.name = extracted;
        fixed++;
      }
    }
  }

  if (fixed > 0) {
    const headers = Object.keys(rows[0]);
    const header = headers.join(",") + "\n";
    const lines = rows.map(row =>
      headers.map(h => {
        const v = row[h] ?? "";
        return v.includes(",") || v.includes('"') || v.includes("\n")
          ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")
    ).join("\n") + "\n";
    fs.writeFileSync(filePath, header + lines, "utf-8");
  }

  return { fixed, total: rows.length };
}

async function main() {
  console.log("🔧 Repairing CSV names from maps_url...\n");

  let totalFixed = 0;
  let totalRows = 0;

  for (const phaseNum of [4, 5]) {
    const phaseDir = path.join(SCRAPER_DIR, `phase${phaseNum}`);
    if (!fs.existsSync(phaseDir)) {
      console.log(`  Phase ${phaseNum} dir not found — skipping`);
      continue;
    }

    const csvFiles = fs.readdirSync(phaseDir).filter(f => f.endsWith(".csv"));
    if (csvFiles.length === 0) {
      console.log(`  Phase ${phaseNum}: no CSV files`);
      continue;
    }

    console.log(`📂 Phase ${phaseNum} (${csvFiles.length} files)`);
    for (const file of csvFiles) {
      const filePath = path.join(phaseDir, file);
      const { fixed, total } = repairCsv(filePath);
      if (fixed > 0 || total > 0) {
        console.log(`  ${file}: fixed ${fixed}/${total} names`);
        totalFixed += fixed;
        totalRows += total;
      }
    }
  }

  console.log(`\n✅ Done — repaired ${totalFixed} names across ${totalRows} rows`);
}

main().catch(e => { console.error(e); process.exit(1); });
