import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = await request.json();

  if (!["SENT", "SKIPPED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.warmupBatchLead.update({
    where: { id: parseInt(params.id) },
    data: {
      status,
      sentAt: status === "SENT" ? new Date() : null,
    },
  });

  if (status === "SENT") {
    await prisma.lead.update({
      where: { id: updated.leadId },
      data: { status: "EMAILED" },
    });
  } else if (status === "PENDING") {
    // Revert lead to NEW only if no other sent email logs
    const logCount = await prisma.emailLog.count({
      where: { leadId: updated.leadId },
    });
    if (logCount === 0) {
      await prisma.lead.update({
        where: { id: updated.leadId },
        data: { status: "NEW" },
      });
    }
  }

  return NextResponse.json({ success: true, batchLead: updated });
}
