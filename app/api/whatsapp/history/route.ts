import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const phase = parseInt(new URL(req.url).searchParams.get("phase") ?? "1");
  try {
    const plan = await prisma.whatsAppPlan.findFirst({
      where: { phase },
      orderBy: { createdAt: "desc" },
    });
    if (!plan) return NextResponse.json({ batches: [] });

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const batches = await prisma.whatsAppBatch.findMany({
      where: { planId: plan.id, date: { lte: endOfToday } },
      include: {
        leads: { include: { lead: true }, orderBy: { id: "asc" } },
      },
      orderBy: { dayNumber: "desc" },
    });

    return NextResponse.json({ batches });
  } catch (e) {
    console.error("[whatsapp/history GET]", e);
    return NextResponse.json({ batches: [], error: String(e) }, { status: 500 });
  }
}
