import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const phase  = parseInt(searchParams.get("phase") ?? "0");
  const excludeLeadIds = (searchParams.get("exclude") ?? "")
    .split(",").filter(Boolean).map(Number);

  const plan = await prisma.warmupPlan.findFirst({
    where: { phase },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return NextResponse.json({ leads: [] });

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const batchLeads = await prisma.warmupBatchLead.findMany({
    where: {
      status: "PENDING",
      batch: { planId: plan.id, date: { gte: tomorrow } },
      ...(excludeLeadIds.length ? { leadId: { notIn: excludeLeadIds } } : {}),
      lead: { warmupLeads: { none: { status: "SENT" } } },
    },
    include: {
      lead: {
        include: { emailLogs: { orderBy: { sentAt: "desc" as const }, take: 3 } },
      },
    },
    orderBy: [{ batch: { dayNumber: "asc" } }, { id: "asc" }],
    take: limit,
  });

  return NextResponse.json({ leads: batchLeads });
}
