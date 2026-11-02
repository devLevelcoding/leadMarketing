import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AgentApiError, agentApi } from "@/lib/aiAgentDb";

// Sent / Skip / Undo for an AI lead, same rules as the warm-up batches:
//   SENT    -> agent lead SENT, CRM lead EMAILED (so no other campaign picks it up)
//   SKIPPED -> agent lead SKIPPED only (CRM untouched, like a skip in warm-up)
//   NEW     -> undo; CRM back to NEW only if no email was ever logged for it
// The agent's status goes through its REST API (PATCH /leads/{id}/status).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { status } = await req.json();
  if (!["SENT", "SKIPPED", "NEW"].includes(status) || !id) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let previous: string | null;
  try {
    ({ previous } = await agentApi<{ previous: string | null }>(`/leads/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }));
  } catch (e) {
    const code = e instanceof AgentApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status: code === 404 ? 404 : code });
  }

  const crm = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
  if (crm && status === "SENT" && crm.status === "NEW") {
    await prisma.lead.update({ where: { id }, data: { status: "EMAILED" } });
  } else if (crm && status === "NEW" && previous === "SENT" && crm.status === "EMAILED") {
    const logs = await prisma.emailLog.count({ where: { leadId: id } });
    const warmupSent = await prisma.warmupBatchLead.count({ where: { leadId: id, status: "SENT" } });
    if (logs === 0 && warmupSent === 0) {
      await prisma.lead.update({ where: { id }, data: { status: "NEW" } });
    }
  }

  return NextResponse.json({ success: true, id, status });
}
