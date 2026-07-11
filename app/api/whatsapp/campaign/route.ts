import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getQuota(day: number, phase?: number): number {
  if (phase === 32) return 5;
  if (day <= 3)  return 15;
  if (day <= 7)  return 20;
  if (day <= 14) return 25;
  if (day <= 21) return 35;
  return 50;
}

function parsePhase(req: NextRequest): number {
  const p = new URL(req.url).searchParams.get("phase");
  return p ? parseInt(p) : 1;
}

export async function GET(req: NextRequest) {
  const phase = parsePhase(req);
  try {
    const plan = await prisma.whatsAppPlan.findFirst({
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

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const batches = plan.batches.map((b) => {
      const bDate = new Date(b.date);
      bDate.setHours(0, 0, 0, 0);
      return {
        id: b.id,
        dayNumber: b.dayNumber,
        date: b.date,
        quota: b.quota,
        sent:      b.leads.filter(l => l.status === "SENT").length,
        noAnswer:  b.leads.filter(l => l.status === "NO_ANSWER").length,
        replied:   b.leads.filter(l => l.status === "REPLIED").length,
        skipped:   b.leads.filter(l => l.status === "SKIPPED").length,
        total:     b.leads.length,
        isToday:   bDate >= start && bDate < end,
        isPast:    bDate < start,
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
  } catch (e) {
    console.error("[whatsapp/campaign GET]", e);
    return NextResponse.json({ plan: null, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const phase: number = body.phase ?? 1;
  try {
    const existing = await prisma.whatsAppPlan.findFirst({ where: { phase } });
    if (existing) {
      return NextResponse.json(
        { error: "Plan for this phase already exists. Delete it first." },
        { status: 400 }
      );
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    startDate.setHours(0, 0, 0, 0);

    // Phase 3 (USA): only leads with WhatsApp + website
    // Phase 32 (USA WA+Web): tagged subset — load directly
    // Other phases: no_website leads if available, else all leads with phone
    let rawLeads: { id: number; country: string | null; phone: string | null }[];
    if (phase === 3) {
      rawLeads = await prisma.lead.findMany({
        where: { phase, hasWhatsapp: true, website: { not: null }, phone: { not: null } },
        select: { id: true, country: true, phone: true },
        orderBy: { id: "asc" },
      });
    } else if (phase === 32) {
      rawLeads = await prisma.lead.findMany({
        where: { phase: 32, phone: { not: null } },
        select: { id: true, country: true, phone: true },
        orderBy: { id: "asc" },
      });
    } else {
      const noWebsiteCount = await prisma.lead.count({ where: { domain: "no_website", phone: { not: null }, phase } });
      rawLeads = await prisma.lead.findMany({
        where: noWebsiteCount > 0
          ? { domain: "no_website", phone: { not: null }, phase }
          : { phone: { not: null }, phase },
        select: { id: true, country: true, phone: true },
        orderBy: { id: "asc" },
      });
    }

    const seenPhones = new Set<string>();
    const leads = rawLeads.filter(l => {
      const key = l.phone!.replace(/[\s\-().]/g, "").toLowerCase();
      if (seenPhones.has(key)) return false;
      seenPhones.add(key);
      return true;
    });

    const byCountry = new Map<string, number[]>();
    for (const l of leads) {
      const key = l.country ?? "__unknown__";
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(l.id);
    }
    const queues = Array.from(byCountry.values());
    const interleaved: number[] = [];
    let qi = 0;
    while (interleaved.length < leads.length) {
      const q = queues[qi % queues.length];
      if (q.length) interleaved.push(q.shift()!);
      qi++;
    }

    const plan = await prisma.whatsAppPlan.create({
      data: { phase, startDate, totalDays: 30 },
    });

    let used = 0;
    for (let day = 1; day <= 30 && used < interleaved.length; day++) {
      const quota = getQuota(day, phase);
      const batchDate = new Date(startDate);
      batchDate.setDate(batchDate.getDate() + day - 1);

      const batch = await prisma.whatsAppBatch.create({
        data: { planId: plan.id, dayNumber: day, date: batchDate, quota },
      });

      const selected = interleaved.slice(used, used + quota);
      used += quota;
      for (const leadId of selected) {
        await prisma.whatsAppBatchLead.create({ data: { batchId: batch.id, leadId } });
      }
    }

    return NextResponse.json({ success: true, planId: plan.id });
  } catch (e) {
    console.error("[whatsapp/campaign POST]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const phase = parsePhase(req);
  try {
    const plans = await prisma.whatsAppPlan.findMany({
      where: { phase },
      include: { batches: { select: { id: true } } },
    });
    for (const plan of plans) {
      const batchIds = plan.batches.map(b => b.id);
      if (batchIds.length) {
        await prisma.whatsAppBatchLead.deleteMany({ where: { batchId: { in: batchIds } } });
        await prisma.whatsAppBatch.deleteMany({ where: { planId: plan.id } });
      }
    }
    await prisma.whatsAppPlan.deleteMany({ where: { phase } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[whatsapp/campaign DELETE]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
