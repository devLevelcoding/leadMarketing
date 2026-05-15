import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { status } = await req.json();
  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  return NextResponse.json({ lead });
}
