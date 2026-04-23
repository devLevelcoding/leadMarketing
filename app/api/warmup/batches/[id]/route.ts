import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const batch = await prisma.warmupBatch.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      leads: {
        include: {
          lead: {
            include: { emailLogs: { orderBy: { sentAt: "desc" }, take: 3 } },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });
  return NextResponse.json({ batch });
}
