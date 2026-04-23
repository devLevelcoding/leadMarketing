import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const phase = parseInt(new URL(req.url).searchParams.get("phase") ?? "0");

  const plan = await prisma.warmupPlan.findFirst({
    where: { phase },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return NextResponse.json({ error: "No plan found" }, { status: 404 });

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find the next upcoming batch
  const nextBatch = await prisma.warmupBatch.findFirst({
    where: { planId: plan.id, date: { gte: tomorrow } },
    orderBy: { dayNumber: "asc" },
  });

  if (!nextBatch) {
    return NextResponse.json({ error: "No upcoming batches" }, { status: 404 });
  }

  // Move it to today
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  await prisma.warmupBatch.update({
    where: { id: nextBatch.id },
    data: { date: today },
  });

  return NextResponse.json({ success: true, dayNumber: nextBatch.dayNumber });
}
