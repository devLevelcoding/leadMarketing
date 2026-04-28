import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sortBy  = searchParams.get("sortBy")  || "secScore";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const filter  = searchParams.get("filter")  || "";  // "errors" | "no_https" | ""

  const leadIdsParam = searchParams.get("leadIds");
  const leadIds = leadIdsParam
    ? leadIdsParam.split(",").map(Number).filter(n => !isNaN(n))
    : null;

  const where: Record<string, unknown> = {};
  if (filter === "errors")   where.error  = { not: null };
  if (filter === "no_https") where.https  = false;
  if (leadIds?.length)       where.leadId = { in: leadIds };

  const scans = await prisma.lighthouseScan.findMany({
    where,
    orderBy: leadIds?.length ? { leadId: "asc" } : { [sortBy]: sortDir },
    include: { lead: { select: { name: true, domain: true, country: true, city: true } } },
  });

  return NextResponse.json({ scans, total: scans.length });
}

export async function DELETE() {
  const { count } = await prisma.lighthouseScan.deleteMany();
  return NextResponse.json({ deleted: count });
}
