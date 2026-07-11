import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "crm_pipeline", "crm_pipeline.db");

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const total = (db.prepare("SELECT COUNT(*) as n FROM leads").get() as any).n;
    const withLinkedin = (db.prepare("SELECT COUNT(*) as n FROM leads WHERE linkedin_url != '' AND linkedin_url IS NOT NULL").get() as any).n;
    const withWebsite = (db.prepare("SELECT COUNT(*) as n FROM leads WHERE website != '' AND website IS NOT NULL").get() as any).n;

    const segments = db.prepare(`
      SELECT country_iso, industry, tier,
             COUNT(*) as count,
             SUM(CASE WHEN linkedin_url != '' AND linkedin_url IS NOT NULL THEN 1 ELSE 0 END) as with_linkedin,
             SUM(CASE WHEN website != '' AND website IS NOT NULL THEN 1 ELSE 0 END) as with_website
      FROM leads
      GROUP BY country_iso, industry, tier
      ORDER BY tier ASC, count DESC
    `).all();

    const msi = db.prepare(`
      SELECT country_iso, industry, opportunity_tier, saturation_score,
             total_sampled, pct_modern_crm, pct_no_crm
      FROM market_saturation_index
      ORDER BY saturation_score ASC
    `).all();

    db.close();

    return NextResponse.json({
      total,
      withLinkedin,
      withWebsite,
      linkedinPct: total ? Math.round((withLinkedin / total) * 100) : 0,
      websitePct: total ? Math.round((withWebsite / total) * 100) : 0,
      segments,
      msi,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
