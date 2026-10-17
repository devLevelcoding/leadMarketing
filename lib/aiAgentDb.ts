import { prisma } from "@/lib/prisma";

// Database of the AI lead agent (F:\AiAgent\lead-intelligence-agent).
export const AI_DB_PATH =
  process.env.AI_AGENT_DB || "F:\\AiAgent\\lead-intelligence-agent\\data\\leads.db";

// Status the AI Leads page sets on the agent's copy of a lead.
export const AI_STATUSES = ["SENT", "SKIPPED"] as const;

/** "https://www.Foo.com/contact/" -> "foo.com/contact"; first site when several are listed. */
export function siteKey(website: string | null): string | null {
  const first = (website || "").split(";")[0].trim().toLowerCase();
  const key = first.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  return key || null;
}

/** Digits only; too short to identify a company -> null. */
export function phoneKey(phone: string | null): string | null {
  const digits = (phone || "").split(";")[0].replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

/**
 * Companies the CRM is already working on: not NEW, in a warm-up or WhatsApp batch, or
 * DMed on Instagram. Matched by id, and by website / phone so the same company under
 * another CRM id counts too.
 */
/** The same companies as raw lists, for the agent API (POST /outreach/search). */
export async function crmContactedLists() {
  const rows = await prisma.$queryRawUnsafe<{ id: number; website: string | null; phone: string | null }[]>(`
    SELECT id, website, phone FROM leads
    WHERE status <> 'NEW'
       OR id IN (SELECT lead_id FROM warmup_batch_leads)
       OR id IN (SELECT lead_id FROM whatsapp_batch_leads)
       OR COALESCE(instagram_status, 'PENDING') NOT IN ('PENDING', 'SKIPPED')`);
  return {
    ids: rows.map(r => Number(r.id)),
    websites: rows.map(r => r.website).filter((w): w is string => !!w),
    phones: rows.map(r => r.phone).filter((p): p is string => !!p),
  };
}

// The AI lead agent's REST API (F:\AiAgent\lead-intelligence-agent). Server-side only:
// the key never reaches the browser.
export const AGENT_API_URL = (process.env.AGENT_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export class AgentApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function agentApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.AGENT_API_KEY) headers.Authorization = `Bearer ${process.env.AGENT_API_KEY}`;
  let res: Response;
  try {
    res = await fetch(`${AGENT_API_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new AgentApiError(
      `The AI agent API is not reachable at ${AGENT_API_URL}. Start it: uv run uvicorn app.main:app`, 503);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new AgentApiError(body?.detail ? String(body.detail) : `Agent API error ${res.status}`, res.status);
  return body as T;
}

/** The agent API's raw response (e.g. a CSV), with the server-side key. */
export async function agentFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.AGENT_API_KEY) headers.Authorization = `Bearer ${process.env.AGENT_API_KEY}`;
  try {
    return await fetch(`${AGENT_API_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    return new Response(JSON.stringify({ detail: `The AI agent API is not reachable at ${AGENT_API_URL}.` }),
      { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

export async function crmContacted() {
  const rows = await prisma.$queryRawUnsafe<{ id: number; website: string | null; phone: string | null }[]>(`
    SELECT id, website, phone FROM leads
    WHERE status <> 'NEW'
       OR id IN (SELECT lead_id FROM warmup_batch_leads)
       OR id IN (SELECT lead_id FROM whatsapp_batch_leads)
       OR COALESCE(instagram_status, 'PENDING') NOT IN ('PENDING', 'SKIPPED')`);
  const ids = new Set<number>(), sites = new Set<string>(), phones = new Set<string>();
  for (const r of rows) {
    ids.add(Number(r.id));
    const s = siteKey(r.website); if (s) sites.add(s);
    const p = phoneKey(r.phone);  if (p) phones.add(p);
  }
  return {
    has: (l: { id: number; website: string | null; phone: string | null }) => {
      const s = siteKey(l.website), p = phoneKey(l.phone);
      return ids.has(l.id) || (!!s && sites.has(s)) || (!!p && phones.has(p));
    },
  };
}
