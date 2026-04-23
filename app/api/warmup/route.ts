import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DOMAINS = ["crm", "no_website", "health", "b2b", "tourism"];

function getQuota(workingDay: number): number {
  if (workingDay <= 3)  return 5;
  if (workingDay <= 7)  return 10;
  if (workingDay <= 14) return 15;
  if (workingDay <= 21) return 20;
  if (workingDay <= 30) return 25;
  if (workingDay <= 65) return 40;
  return 60;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parsePhase(req: NextRequest): number {
  const p = new URL(req.url).searchParams.get("phase");
  return p ? parseInt(p) : 0;
}

export async function GET(req: NextRequest) {
  const phase = parsePhase(req);

  const plan = await prisma.warmupPlan.findFirst({
    where: { phase },
    orderBy: { createdAt: "desc" },
    include: {
      batches: {
        include: { leads: { select: { status: true } } },
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!plan) return NextResponse.json({ plan: null });

  const { start, end } = todayRange();

  const batches = plan.batches.map((b) => {
    const bDate = new Date(b.date);
    bDate.setHours(0, 0, 0, 0);
    return {
      id: b.id,
      dayNumber: b.dayNumber,
      date: b.date,
      quota: b.quota,
      sent:    b.leads.filter(l => l.status === "SENT").length,
      skipped: b.leads.filter(l => l.status === "SKIPPED").length,
      total:   b.leads.length,
      isToday: bDate >= start && bDate < end,
      isPast:  bDate < start,
    };
  });

  const todayBatch = batches.find(b => b.isToday) ?? null;

  return NextResponse.json({
    plan: {
      id: plan.id,
      phase: plan.phase,
      startDate: plan.startDate,
      totalDays: plan.totalDays,
      currentDay: todayBatch?.dayNumber ?? null,
      batches,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phase: number = body.phase ?? 0;

  const existing = await prisma.warmupPlan.findFirst({ where: { phase } });
  if (existing) {
    return NextResponse.json({ error: "Plan for this phase already exists. Delete it first." }, { status: 400 });
  }

  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  startDate.setHours(0, 0, 0, 0);

  // Load leads per domain, interleaved round-robin by country for diversity
  const leadsByDomain: Record<string, number[]> = {};
  for (const domain of DOMAINS) {
    const where: { domain: string; phase?: number } = { domain };
    if (phase !== 0) where.phase = phase;
    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, country: true },
      orderBy: { id: "asc" },
    });
    // Group by country, then interleave so each batch gets diverse countries
    const byCountry = new Map<string, number[]>();
    for (const l of leads) {
      const key = l.country ?? "__unknown__";
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(l.id);
    }
    const queues = [...byCountry.values()];
    const interleaved: number[] = [];
    let i = 0;
    while (interleaved.length < leads.length) {
      const q = queues[i % queues.length];
      if (q.length) interleaved.push(q.shift()!);
      i++;
    }
    leadsByDomain[domain] = interleaved;
  }

  const plan = await prisma.warmupPlan.create({
    data: { phase, startDate, totalDays: 30 },
  });

  const usedPerDomain: Record<string, number> = {};
  DOMAINS.forEach(d => { usedPerDomain[d] = 0; });

  for (let day = 1; day <= 30; day++) {
    const quota = getQuota(day);
    const perDomain = quota / DOMAINS.length;

    const batchDate = new Date(startDate);
    batchDate.setDate(batchDate.getDate() + day - 1);

    const batch = await prisma.warmupBatch.create({
      data: { planId: plan.id, dayNumber: day, date: batchDate, quota },
    });

    for (const domain of DOMAINS) {
      const pool = leadsByDomain[domain];
      const selected = pool.slice(usedPerDomain[domain], usedPerDomain[domain] + perDomain);
      usedPerDomain[domain] += perDomain;
      for (const leadId of selected) {
        await prisma.warmupBatchLead.create({ data: { batchId: batch.id, leadId } });
      }
    }
  }

  return NextResponse.json({ success: true, planId: plan.id });
}

export async function DELETE(req: NextRequest) {
  const phase = parsePhase(req);
  const plans = await prisma.warmupPlan.findMany({
    where: { phase },
    include: { batches: { select: { id: true } } },
  });
  for (const plan of plans) {
    const batchIds = plan.batches.map(b => b.id);
    if (batchIds.length) {
      await prisma.warmupBatchLead.deleteMany({ where: { batchId: { in: batchIds } } });
      await prisma.warmupBatch.deleteMany({ where: { planId: plan.id } });
    }
  }
  await prisma.warmupPlan.deleteMany({ where: { phase } });
  return NextResponse.json({ success: true });
}
