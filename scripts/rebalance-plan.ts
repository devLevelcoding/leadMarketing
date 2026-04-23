/**
 * Rebuilds lead assignments for all future batches of a warmup plan
 * using a single country-first round-robin pool for diversity.
 * Pass phase as CLI arg: npx tsx scripts/rebalance-plan.ts 0
 * Past and today batches are untouched.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const phase = parseInt(process.argv[2] ?? "1");

  const plan = await prisma.warmupPlan.findFirst({
    where: { phase },
    orderBy: { createdAt: "desc" },
    include: { batches: { orderBy: { dayNumber: "asc" } } },
  });

  if (!plan) { console.error(`No Phase ${phase} plan found.`); process.exit(1); }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastOrTodayBatches = plan.batches.filter(b => new Date(b.date) <= today);
  const futureBatches      = plan.batches.filter(b => new Date(b.date) >  today);

  console.log(`Plan ID: ${plan.id} | Phase: ${phase}`);
  console.log(`Kept (past/today): days ${pastOrTodayBatches.map(b => b.dayNumber).join(", ")}`);
  console.log(`Rebuilding:        days ${futureBatches.map(b => b.dayNumber).join(", ")}`);

  // Collect all lead IDs already assigned in past/today batches
  const usedIds = new Set<number>();
  for (const b of pastOrTodayBatches) {
    const bls = await prisma.warmupBatchLead.findMany({
      where: { batchId: b.id },
      select: { leadId: true },
    });
    bls.forEach(bl => usedIds.add(bl.leadId));
  }
  console.log(`Excluded (already assigned): ${usedIds.size} leads`);

  // Load remaining leads (phase 0 = all phases)
  const allLeads = await prisma.lead.findMany({
    where: {
      ...(phase !== 0 ? { phase } : {}),
      ...(usedIds.size > 0 ? { id: { notIn: [...usedIds] } } : {}),
    },
    select: { id: true, country: true },
    orderBy: { id: "asc" },
  });

  console.log(`Remaining lead pool: ${allLeads.length} leads`);

  // Round-robin by country
  const byCountry = new Map<string, typeof allLeads>();
  for (const l of allLeads) {
    const key = l.country ?? "__unknown__";
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key)!.push(l);
  }
  const countries = [...byCountry.keys()];
  console.log(`Countries (${countries.length}): ${countries.join(", ")}`);

  const queues = [...byCountry.values()];
  const pool: number[] = [];
  let i = 0;
  while (pool.length < allLeads.length) {
    const q = queues[i % queues.length];
    if (q.length) pool.push(q.shift()!.id);
    i++;
  }

  // Rebuild future batches
  let cursor = 0;
  for (const batch of futureBatches) {
    await prisma.warmupBatchLead.deleteMany({ where: { batchId: batch.id } });
    const slice = pool.slice(cursor, cursor + batch.quota);
    cursor += batch.quota;
    for (const leadId of slice) {
      await prisma.warmupBatchLead.create({ data: { batchId: batch.id, leadId } });
    }
    console.log(`  Day ${batch.dayNumber} (quota ${batch.quota}): ${slice.length} leads`);
  }

  console.log(`\nDone. ${cursor} leads assigned across ${futureBatches.length} future batches.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
