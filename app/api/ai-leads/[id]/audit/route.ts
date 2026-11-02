import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanWebsite } from "@/lib/scanner";

// Website audit for one AI lead (same id as the CRM lead): GET the latest Lighthouse scan,
// POST to scan the site now. Saved in lighthouse_scans, so /admin/lighthouse shows it too.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  if (isNaN(leadId)) return NextResponse.json({ scan: null });
  const scan = await prisma.lighthouseScan.findFirst({ where: { leadId }, orderBy: { scannedAt: "desc" } });
  return NextResponse.json({ scan });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  if (isNaN(leadId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true, website: true } });
  if (!lead) return NextResponse.json({ error: `Lead #${leadId} is not in the CRM` }, { status: 404 });
  const website = ((lead.website || body.website || "") as string).split(";")[0].trim();
  if (!website) return NextResponse.json({ error: "No website to scan" }, { status: 400 });

  const r = await scanWebsite(lead.id, lead.name, website);
  const { leadId: _l, leadName: _n, ...data } = r;
  await prisma.lighthouseScan.deleteMany({ where: { leadId } });
  const scan = await prisma.lighthouseScan.create({ data: { leadId, ...data } });
  return NextResponse.json({ scan });
}
