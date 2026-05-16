import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  try {
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const status = url.searchParams.get("status") ?? "all";
    const search = (url.searchParams.get("q") ?? "").trim();

    // Build base filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { phase: 6, instagramUrl: { not: null } };

    if (status === "PENDING") {
      where.OR = [{ instagramStatus: null }, { instagramStatus: "PENDING" }];
    } else if (status === "DM_SENT" || status === "SKIPPED" || status === "REPLIED") {
      where.instagramStatus = status;
    }

    if (search) {
      const sq = { contains: search };
      where.AND = [{ OR: [{ name: sq }, { country: sq }, { city: sq }] }];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        select: {
          id: true, name: true, country: true, city: true,
          searchCategory: true, category: true, domain: true,
          website: true, instagramUrl: true,
          instagramStatus: true, instagramDmAt: true,
          status: true,
        },
        orderBy: [{ country: "asc" }, { name: "asc" }],
        skip:  (page - 1) * PAGE_SIZE,
        take:  PAGE_SIZE,
      }),
    ]);

    return NextResponse.json({ leads, total, page, pageSize: PAGE_SIZE });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[instagram-leads GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { leadId, status } = await req.json();
    if (!leadId || !status) {
      return NextResponse.json({ error: "Missing leadId or status" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { instagramStatus: status };
    if (status === "DM_SENT") data.instagramDmAt = new Date();
    if (status === "PENDING") data.instagramDmAt = null;

    await prisma.lead.update({ where: { id: leadId }, data });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[instagram-leads PATCH]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
