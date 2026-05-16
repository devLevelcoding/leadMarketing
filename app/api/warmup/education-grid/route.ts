import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // 1) Count per country
  const counts = await prisma.lead.groupBy({
    by: ["country"],
    where: { phase: 6, country: { not: null } },
    _count: { id: true },
    orderBy: { country: "asc" },
  });

  const countMap = new Map(counts.map(c => [c.country!, c._count.id]));

  const LEAD_SELECT = {
    id: true, name: true, category: true, searchCategory: true,
    website: true, city: true, country: true, status: true, domain: true, instagramUrl: true,
  } as const;

  // 2) One query: all phase-6 leads that have a website — pick first per country
  const withSite = await prisma.lead.findMany({
    where: { phase: 6, website: { not: null } },
    select: LEAD_SELECT,
    orderBy: { country: "asc" },
  });

  const byCountry = new Map<string, typeof withSite[0]>();
  for (const lead of withSite) {
    if (lead.country && !byCountry.has(lead.country)) byCountry.set(lead.country, lead);
  }

  // 3) Second query: fallback for countries that have no website lead at all
  const missing = counts.map(c => c.country!).filter(c => !byCountry.has(c));
  if (missing.length > 0) {
    const fallbacks = await prisma.lead.findMany({
      where: { phase: 6, country: { in: missing } },
      select: LEAD_SELECT,
      orderBy: { country: "asc" },
    });
    for (const lead of fallbacks) {
      if (lead.country && !byCountry.has(lead.country)) byCountry.set(lead.country, lead);
    }
  }

  const countries = counts
    .map(c => ({ country: c.country!, total: countMap.get(c.country!)!, lead: byCountry.get(c.country!) }))
    .filter(r => r.lead);

  return NextResponse.json({ countries });
}
