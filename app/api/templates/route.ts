import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = await prisma.emailTemplate.create({
    data: {
      name:     body.name,
      language: body.language || "en",
      domain:   body.domain || null,
      subject:  body.subject,
      body:     body.body,
    },
  });
  return NextResponse.json(template);
}
