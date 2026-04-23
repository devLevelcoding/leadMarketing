import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const t = await prisma.emailTemplate.findUnique({ where: { id: parseInt(params.id) } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const t = await prisma.emailTemplate.update({
    where: { id: parseInt(params.id) },
    data: {
      name:     body.name,
      language: body.language,
      domain:   body.domain,
      subject:  body.subject,
      body:     body.body,
    },
  });
  return NextResponse.json(t);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.emailTemplate.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
