import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const phase = parseInt(new URL(req.url).searchParams.get("phase") ?? "1");
  try {
    const plan = await prisma.whatsAppPlan.findFirst({
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
        include: { lead: true },
        orderBy: { id: "asc" as const },
      },
    };

    const batch =
      (await prisma.whatsAppBatch.findFirst({
        where: { planId: plan.id, date: { gte: start, lt: end }, leads: { some: { status: "PENDING" } } },
        include: batchInclude,
      })) ??
      (await prisma.whatsAppBatch.findFirst({
        where: { planId: plan.id, date: { gte: start, lt: end } },
        orderBy: { dayNumber: "desc" },
        include: batchInclude,
      }));

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
        if (i > queues.length * 10000) break;
      }
      (batch as any).leads = interleaved;
    }

    return NextResponse.json({ batch });
  } catch (e) {
    console.error("[whatsapp/today GET]", e);
    return NextResponse.json({ batch: null, error: String(e) }, { status: 500 });
  }
}
