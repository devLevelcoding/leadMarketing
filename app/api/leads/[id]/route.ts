import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      emailLogs: {
        orderBy: { sentAt: "desc" },
        include: { template: { select: { name: true } } },
      },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const id = parseInt(params.id);

  // Handle adding a note
  if (body.addNote) {
    const note = await prisma.note.create({
      data: { leadId: id, content: body.addNote },
    });
    return NextResponse.json(note);
  }

  // Handle logging an email
  if (body.logEmail) {
    const log = await prisma.emailLog.create({
      data: {
        leadId:     id,
        templateId: body.logEmail.templateId || null,
        subject:    body.logEmail.subject,
        body:       body.logEmail.body,
        status:     "SENT",
      },
    });
    // Auto-update lead status to EMAILED if still NEW
    await prisma.lead.updateMany({
      where: { id, status: "NEW" },
      data:  { status: "EMAILED" },
    });
    return NextResponse.json(log);
  }

  // Update lead fields (status, etc.)
  const allowed = ["status", "phone", "website", "address"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const lead = await prisma.lead.update({ where: { id }, data });
  return NextResponse.json(lead);
}
