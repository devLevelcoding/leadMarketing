import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runFullScan } from "@/lib/fullScanner";
import { runConcurrent } from "@/lib/scanner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const explicitIds: number[] | undefined = Array.isArray(body.leadIds) ? body.leadIds : undefined;

  const leads = await (explicitIds
    ? prisma.lead.findMany({
        where: { id: { in: explicitIds }, website: { not: null } },
        select: { id: true, website: true },
      })
    : prisma.lead.findMany({
        where: { website: { not: null } },
        select: { id: true, website: true },
        take: 100,
        orderBy: { id: "asc" },
      }));

  const encoder = new TextEncoder();
  function emit(data: unknown): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(emit({ type: "start", total: leads.length }));

      let done = 0;
      const tasks = leads.map(lead => async () => {
        const result = await runFullScan(lead.id, lead.website!);

        await prisma.leadReport.upsert({
          where:  { leadId: lead.id },
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

        done++;
        controller.enqueue(emit({ type: "progress", done, total: leads.length }));
      });

      await runConcurrent(tasks, 4, () => {});

      controller.enqueue(emit({ type: "done", total: leads.length }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
