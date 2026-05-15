import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country");
  if (!country) return NextResponse.json({ leads: [], total: 0 });

  const leads = await prisma.lead.findMany({
    where: { country: { contains: country } },
    include: {
      emailLogs: { orderBy: { sentAt: "desc" }, take: 5 },
    },
    orderBy: [{ domain: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ leads, total: leads.length });
}
