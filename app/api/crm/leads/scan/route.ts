import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { scanWebsite } from "@/lib/scanner";

const DB_PATH = path.join(process.cwd(), "crm_pipeline", "crm_pipeline.db");

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { id, name, website } = await req.json();
    if (!id || !website) {
      return NextResponse.json({ error: "id and website required" }, { status: 400 });
    }

    const result = await scanWebsite(id, name ?? "", website);

    const db = new Database(DB_PATH);
    db.prepare(`
      UPDATE leads
      SET scan_sec = ?, scan_seo = ?, scan_sem = ?, scan_json = ?
      WHERE id = ?
    `).run(result.secScore, result.seoScore, result.semScore, JSON.stringify(result), id);
    db.close();

    return NextResponse.json({ scan: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
