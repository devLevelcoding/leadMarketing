import { NextRequest, NextResponse } from "next/server";
import { AgentApiError, agentApi, crmContactedLists } from "@/lib/aiAgentDb";

// Results of the AI lead agent, through its REST API (POST /outreach/search). The CRM is
// this app's own database: it decides which companies a campaign already reached, and the
// agent moves those from "To send" to "Done". Sent / Skip are set in ./[id]/route.ts.
const PAGE_SIZE = 50;

type OutreachPage = {
  leads: Record<string, unknown>[]; total: number; page: number; pages: number; page_size: number;
  stats: Record<string, number | null>; countries: { country: string; n: number }[];
  industries?: { industry: string; n: number }[];
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const email = sp.get("email") || "";                       // "yes" | "no" | ""
  const query = {
    view: ["done", "all"].includes(sp.get("view") || "") ? sp.get("view") : "todo",
    country: sp.get("country") || null,
    industry: sp.get("industry") || null,
    sort: sp.get("sort") || "fit",
    has_email: email === "yes" ? true : email === "no" ? false : null,
    min_fit: parseInt(sp.get("minFit") || "0") || 0,
    q: sp.get("q") || null,
    page: Math.max(1, parseInt(sp.get("page") || "1")),
    page_size: PAGE_SIZE,
    contacted: await crmContactedLists(),
  };
  try {
    const r = await agentApi<OutreachPage>("/outreach/search", { method: "POST", body: JSON.stringify(query) });
    return NextResponse.json({
      leads: r.leads, total: r.total, page: r.page, pages: r.pages, pageSize: r.page_size,
      stats: r.stats, countries: r.countries, industries: r.industries ?? [],
    });
  } catch (e) {
    const status = e instanceof AgentApiError ? e.status : 500;
    return NextResponse.json({ error: `Could not read AI results: ${(e as Error).message}` }, { status });
  }
}
