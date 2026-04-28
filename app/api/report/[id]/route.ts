import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runFullScan } from "@/lib/fullScanner";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  if (isNaN(leadId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const report = await prisma.leadReport.findUnique({ where: { leadId } });
  return NextResponse.json({ report });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  if (isNaN(leadId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, website: true },
  });

  if (!lead?.website) {
    return NextResponse.json({ error: "no website" }, { status: 400 });
  }

  const result = await runFullScan(leadId, lead.website);

  const report = await prisma.leadReport.upsert({
    where: { leadId },
    create: {
      leadId:       result.leadId,
      loadTimeMs:   result.loadTimeMs,
      sslValid:     result.sslValid,
      sslExpiryDays: result.sslExpiryDays,
      sslIssuer:    result.sslIssuer,
      hasViewport:  result.hasViewport,
      hasTouchIcon: result.hasTouchIcon,
      totalLinks:   result.totalLinks,
      brokenLinks:  result.brokenLinks,
      brokenUrls:   result.brokenUrls.length ? JSON.stringify(result.brokenUrls) : null,
      hasFacebook:  result.hasFacebook,
      hasInstagram: result.hasInstagram,
      hasLinkedIn:  result.hasLinkedIn,
      hasTiktok:    result.hasTiktok,
      hasYoutube:   result.hasYoutube,
      hasTwitter:   result.hasTwitter,
      hasSPF:       result.hasSPF,
      hasDKIM:      result.hasDKIM,
      hasDMARC:     result.hasDMARC,
      spfValue:     result.spfValue,
      dmarcPolicy:  result.dmarcPolicy,
      error:        result.error,
    },
    update: {
      scannedAt:    new Date(),
      loadTimeMs:   result.loadTimeMs,
      sslValid:     result.sslValid,
      sslExpiryDays: result.sslExpiryDays,
      sslIssuer:    result.sslIssuer,
      hasViewport:  result.hasViewport,
      hasTouchIcon: result.hasTouchIcon,
      totalLinks:   result.totalLinks,
      brokenLinks:  result.brokenLinks,
      brokenUrls:   result.brokenUrls.length ? JSON.stringify(result.brokenUrls) : null,
      hasFacebook:  result.hasFacebook,
      hasInstagram: result.hasInstagram,
      hasLinkedIn:  result.hasLinkedIn,
      hasTiktok:    result.hasTiktok,
      hasYoutube:   result.hasYoutube,
      hasTwitter:   result.hasTwitter,
      hasSPF:       result.hasSPF,
      hasDKIM:      result.hasDKIM,
      hasDMARC:     result.hasDMARC,
      spfValue:     result.spfValue,
      dmarcPolicy:  result.dmarcPolicy,
      error:        result.error,
    },
  });

  return NextResponse.json({ report });
}
