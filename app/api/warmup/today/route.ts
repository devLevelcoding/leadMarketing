import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const phase = parseInt(new URL(req.url).searchParams.get("phase") ?? "0");

  const plan = await prisma.warmupPlan.findFirst({
    where: { phase },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return NextResponse.json({ batch: null });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const batchInclude = {
    leads: {
      include: {
        lead: {
          include: { emailLogs: { orderBy: { sentAt: "desc" as const }, take: 3 } },
        },
      },
      orderBy: { id: "asc" as const },
    },
  };

  // After an advance there can be two batches for today (old completed + new pending).
  // Always prefer the one that still has work to do (PENDING leads).
  // Fall back to the highest day-number batch when all are done.
  const batch =
    (await prisma.warmupBatch.findFirst({
      where: { planId: plan.id, date: { gte: start, lt: end }, leads: { some: { status: "PENDING" } } },
      include: batchInclude,
    })) ??
    (await prisma.warmupBatch.findFirst({
      where: { planId: plan.id, date: { gte: start, lt: end } },
      orderBy: { dayNumber: "desc" },
      include: batchInclude,
    }));

  return NextResponse.json({ batch });
}
