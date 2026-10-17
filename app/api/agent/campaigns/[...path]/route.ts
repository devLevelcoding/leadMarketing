import { NextRequest } from "next/server";
import { agentFetch } from "@/lib/aiAgentDb";

// The campaign grid's calls (CSV export, mark all sent / undo), relayed with the server-side
// key. Only /campaigns/<id>/csv (GET) and /campaigns/<id>/status (POST) pass.
const ALLOWED = /^\d+\/(csv|status)$/;

async function relay(req: NextRequest, path: string[], method: "GET" | "POST") {
  const sub = path.join("/");
  if (!ALLOWED.test(sub) || (method === "GET") !== sub.endsWith("csv")) {
    return Response.json({ detail: "Not allowed" }, { status: 404 });
  }
  const res = await agentFetch(`/campaigns/${sub}`, {
    method, body: method === "POST" ? await req.text() : undefined,
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json",
               ...(res.headers.get("Content-Disposition") ? { "Content-Disposition": res.headers.get("Content-Disposition")! } : {}) },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return relay(req, params.path, "GET");
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return relay(req, params.path, "POST");
}
