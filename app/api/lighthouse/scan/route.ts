import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanWebsite, runConcurrent } from "@/lib/scanner";

export const maxDuration = 300; // 5 min cap (for self-hosted)
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const limit      = Math.min(parseInt(body.limit ?? "100"), 200);
  const phase      = body.phase  ? parseInt(body.phase)  : undefined;
  const domain     = body.domain ?? undefined;
  const explicitIds: number[] | undefined = Array.isArray(body.leadIds) ? body.leadIds : undefined;

  // If specific lead IDs are provided, scan exactly those (ignores limit/phase/domain)
  // Otherwise fall back to newest-N bulk scan
  const leads = await (explicitIds
    ? prisma.lead.findMany({
        where: { id: { in: explicitIds }, website: { not: null } },
        select: { id: true, name: true, website: true },
      })
    : prisma.lead.findMany({
        where: {
          website: { not: null },
          ...(phase  !== undefined ? { phase }  : {}),
          ...(domain !== undefined ? { domain } : {}),
        },
        select: { id: true, name: true, website: true },
        take: limit,
        orderBy: { id: "asc" },  // oldest-first so we cover all leads evenly
      }));

  // Delete previous scans for these leads so we always have fresh data
  if (leads.length > 0) {
    await prisma.lighthouseScan.deleteMany({
      where: { leadId: { in: leads.map(l => l.id) } },
    });
  }

  const encoder = new TextEncoder();

  function emit(data: unknown): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(emit({ type: "start", total: leads.length }));

      let done = 0;
      const tasks = leads.map(lead => async () => {
        const result = await scanWebsite(lead.id, lead.name, lead.website!);

        // Persist to DB
        await prisma.lighthouseScan.create({
          data: {
            leadId:    result.leadId,
            url:       result.url,
            https:     result.https,
            hsts:      result.hsts,
            xfo:       result.xfo,
            csp:       result.csp,
            xcto:      result.xcto,
            xssHeader: result.xssHeader,
            secScore:  result.secScore,
            hasTitle:     result.hasTitle,
            hasMeta:      result.hasMeta,
            hasH1:        result.hasH1,
            hasCanonical: result.hasCanonical,
            hasOg:        result.hasOg,
            hasRobots:    result.hasRobots,
            hasSitemap:   result.hasSitemap,
            seoScore:     result.seoScore,
            hasGa:        result.hasGa,
            hasGtm:       result.hasGtm,
            hasFbPixel:   result.hasFbPixel,
            hasLinkedIn:  result.hasLinkedIn,
            hasSchemaOrg: result.hasSchemaOrg,
            hasHotjar:    result.hasHotjar,
            semScore:     result.semScore,
            statusCode:   result.statusCode,
            error:        result.error,
          },
        });

        done++;
        controller.enqueue(emit({ type: "progress", done, total: leads.length, result }));
        return result;
      });

      await runConcurrent(tasks, 8, () => {});

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
