import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page     = parseInt(searchParams.get("page")    || "1");
  const limit    = parseInt(searchParams.get("limit")   || "50");
  const domain   = searchParams.get("domain")   || undefined;
  const country  = searchParams.get("country")  || undefined;
  const status   = searchParams.get("status")   || undefined;
  const category = searchParams.get("category") || undefined;
  const city     = searchParams.get("city")     || undefined;
  const search   = searchParams.get("search")   || undefined;
  const sortBy   = searchParams.get("sortBy")   || "createdAt";
  const sortDir  = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

  const phaseParam = searchParams.get("phase");
  const phase = phaseParam ? parseInt(phaseParam) : undefined;

  const where: Record<string, unknown> = {};
  if (phase !== undefined) where.phase = phase;
  if (domain)  where.domain  = domain;
  if (country) where.country = country;
  if (city)    where.city    = city;
  if (status)  where.status  = status;
  if (category) where.category = { contains: category, mode: "insensitive" };
  if (search) {
    where.OR = [
      { name:    { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { phone:   { contains: search, mode: "insensitive" } },
      { website: { contains: search, mode: "insensitive" } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { notes: true, emailLogs: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, limit });
}
