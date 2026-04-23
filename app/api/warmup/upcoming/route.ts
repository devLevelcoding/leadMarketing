import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days  = parseInt(searchParams.get("days")  ?? "5");
  const phase = parseInt(searchParams.get("phase") ?? "0");

  const plan = await prisma.warmupPlan.findFirst({
    where: { phase },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return NextResponse.json({ batches: [] });

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const end = new Date(tomorrow);
  end.setDate(end.getDate() + days);

  const batches = await prisma.warmupBatch.findMany({
    where: { planId: plan.id, date: { gte: tomorrow, lt: end } },
    include: {
      leads: { include: { lead: true }, orderBy: { id: "asc" } },
    },
    orderBy: { dayNumber: "asc" },
  });

  return NextResponse.json({ batches });
}
