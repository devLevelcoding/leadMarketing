import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  if (isNaN(leadId)) return NextResponse.json({ scan: null });

  const scan = await prisma.lighthouseScan.findFirst({
    where: { leadId },
    orderBy: { scannedAt: "desc" },
  });

  return NextResponse.json({ scan });
}
