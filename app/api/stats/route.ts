import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phaseParam = searchParams.get("phase");
  const where = phaseParam && phaseParam !== "all"
    ? { phase: parseInt(phaseParam) }
    : {};

  const [total, byDomain, byStatus, byCountry, byPhase, byCountryContacted, byCountrySkipped] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ["domain"], where, _count: { id: true } }),
    prisma.lead.groupBy({ by: ["status"], where, _count: { id: true } }),
    prisma.lead.groupBy({
      by: ["country"], where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.lead.groupBy({
      by: ["phase"],
      _count: { id: true },
      orderBy: { phase: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["country"],
      where: { ...where, status: { not: "NEW" } },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["country"],
      where: { ...where, whatsappLeads: { some: { status: "SKIPPED" } } },
      _count: { id: true },
    }),
  ]);

  const contactedByCountry: Record<string, number> = {};
  for (const row of byCountryContacted) {
    contactedByCountry[row.country ?? ""] = row._count.id;
  }

  const skippedByCountry: Record<string, number> = {};
  for (const row of byCountrySkipped) {
    skippedByCountry[row.country ?? ""] = row._count.id;
  }

  const byCountryWithProgress = byCountry.map(c => ({
    ...c,
    contacted: contactedByCountry[c.country ?? ""] ?? 0,
    skipped: skippedByCountry[c.country ?? ""] ?? 0,
  }));

  return NextResponse.json({ total, byDomain, byStatus, byCountry: byCountryWithProgress, byPhase });
}
