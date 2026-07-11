import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { url, name, email, company } = await req.json();

    if (!url || !email) {
      return NextResponse.json({ error: "url and email required" }, { status: 400 });
    }

    const audit = await prisma.auditRequest.create({
      data: { url, name, email, company },
    });

    return NextResponse.json({ ok: true, id: audit.id });
  } catch (err) {
    console.error("audit POST error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function GET() {
  const audits = await prisma.auditRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(audits);
}
