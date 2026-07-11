import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "crm_pipeline", "crm_pipeline.db");
const VALID = ["PENDING", "SENT", "SKIPPED"];

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !VALID.includes(status)) {
      return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
    }
    const db = new Database(DB_PATH);
    db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(status, id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
