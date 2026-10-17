import { NextResponse } from "next/server";
import { AGENT_API_URL, AgentApiError, agentApi } from "@/lib/aiAgentDb";

// A 5-minute ticket for the copilot's WebSocket. The page never sees AGENT_API_KEY: this
// server asks the agent for a ticket with the key and passes on only the ticket and the
// socket URL (http(s)://agent -> ws(s)://agent/ws/chat).
export async function POST() {
  try {
    const t = await agentApi<{ ticket: string; expires_at: string }>("/chat/tickets", { method: "POST" });
    return NextResponse.json({ ...t, ws_url: AGENT_API_URL.replace(/^http/, "ws") + "/ws/chat" });
  } catch (e) {
    const status = e instanceof AgentApiError ? e.status : 500;
    return NextResponse.json({ detail: (e as Error).message }, { status });
  }
}
