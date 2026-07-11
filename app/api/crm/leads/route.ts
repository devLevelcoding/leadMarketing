import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "crm_pipeline", "crm_pipeline.db");
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const country   = searchParams.get("country") || "";
  const industry  = searchParams.get("industry") || "";
  const tier      = searchParams.get("tier") || "";
  const q         = searchParams.get("q") || "";
  const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));

  try {
    const db = new Database(DB_PATH, { readonly: true });

    const conditions: string[] = [];
    const params: any[] = [];

    if (country)  { conditions.push("country_iso = ?");  params.push(country); }
    if (industry) { conditions.push("industry = ?");     params.push(industry); }
    if (tier)     { conditions.push("tier = ?");         params.push(tier); }
    if (q) {
      conditions.push("(name LIKE ? OR city LIKE ? OR website LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRow = db.prepare(`SELECT COUNT(*) as n FROM leads ${where}`).get(...params) as any;
    const total = countRow.n;

    const leads = db.prepare(`
      SELECT id, name, country_iso, industry, tier,
             website, phone, city, address,
             linkedin_url, google_maps_url, source, status,
             scan_sec, scan_seo, scan_sem, scan_json, created_at
      FROM leads
      ${where}
      ORDER BY CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END ASC,
               tier ASC, country_iso ASC, industry ASC, name ASC
      LIMIT ? OFFSET ?
    `).all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);

    // Tier counts — without tier filter
    const noTierConds: string[] = [];
    const noTierParams: any[] = [];
    if (country)  { noTierConds.push("country_iso = ?"); noTierParams.push(country); }
    if (industry) { noTierConds.push("industry = ?");    noTierParams.push(industry); }
    if (q) {
      noTierConds.push("(name LIKE ? OR city LIKE ? OR website LIKE ?)");
      noTierParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const noTierWhere = noTierConds.length ? `WHERE ${noTierConds.join(" AND ")}` : "";
    const tierRows = db.prepare(
      `SELECT tier, COUNT(*) as n FROM leads ${noTierWhere} GROUP BY tier`
    ).all(...noTierParams) as { tier: string; n: number }[];
    const tierCounts: Record<string, number> = {};
    for (const r of tierRows) tierCounts[r.tier] = r.n;

    // Country counts — without country filter
    const noCountryConds: string[] = [];
    const noCountryParams: any[] = [];
    if (tier)     { noCountryConds.push("tier = ?");      noCountryParams.push(tier); }
    if (industry) { noCountryConds.push("industry = ?");  noCountryParams.push(industry); }
    if (q) {
      noCountryConds.push("(name LIKE ? OR city LIKE ? OR website LIKE ?)");
      noCountryParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const noCountryWhere = noCountryConds.length ? `WHERE ${noCountryConds.join(" AND ")}` : "";
    const countryRows = db.prepare(
      `SELECT country_iso, COUNT(*) as n FROM leads ${noCountryWhere} GROUP BY country_iso ORDER BY country_iso`
    ).all(...noCountryParams) as { country_iso: string; n: number }[];
    const countryCounts: Record<string, number> = {};
    for (const r of countryRows) countryCounts[r.country_iso] = r.n;

    db.close();

    return NextResponse.json({
      leads,
      total,
      page,
      pageSize: PAGE_SIZE,
      pages: Math.ceil(total / PAGE_SIZE),
      tierCounts,
      countryCounts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
