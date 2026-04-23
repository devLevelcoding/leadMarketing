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

  // Reorder leads round-robin by country for diversity (1 per country before repeating)
  if (batch) {
    const groups = new Map<string, typeof batch.leads>();
    for (const bl of batch.leads) {
      const key = bl.lead.country ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(bl);
    }
    const interleaved: typeof batch.leads = [];
    const queues = [...groups.values()];
    let i = 0;
    while (interleaved.length < batch.leads.length) {
      const q = queues[i % queues.length];
      if (q.length) interleaved.push(q.shift()!);
      i++;
      if (i > queues.length * 10000) break; // safety
    }
    (batch as any).leads = interleaved;
  }

  return NextResponse.json({ batch });
}
