import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = await request.json();

  if (!["SENT", "NO_ANSWER", "REPLIED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const updated = await prisma.whatsAppBatchLead.update({
      where: { id: parseInt(params.id) },
      data: {
        status,
        sentAt: status !== "PENDING" ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true, batchLead: updated });
  } catch (e) {
    console.error("[whatsapp/batch-leads PATCH]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
