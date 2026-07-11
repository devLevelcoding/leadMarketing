#!/usr/bin/env tsx
/**
 * Tags USA phase-3 leads that have BOTH a WhatsApp number AND a website
 * as phase 32 ("Phase 3.2 — USA WA + Website").
 * Run after import-leads.ts.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏷  Tagging Phase 3.2 — USA leads with WhatsApp + Website...\n");

  // First, reset any existing phase-32 leads back to phase 3
  // (in case this script is run multiple times)
  const reset = await prisma.lead.updateMany({
    where: { phase: 32 },
    data: { phase: 3 },
  });
  if (reset.count > 0) console.log(`  ↩  Reset ${reset.count} existing phase-32 leads → phase 3`);

  // Promote qualifying leads: phase 3 + hasWhatsapp + website
  const promoted = await prisma.lead.updateMany({
    where: {
      phase: 3,
      hasWhatsapp: true,
      website:     { not: null },
      phone:       { not: null },
    },
    data: { phase: 32 },
  });

  const total3   = await prisma.lead.count({ where: { phase: 3  } });
  const total32  = await prisma.lead.count({ where: { phase: 32 } });

  console.log(`  ✅ Promoted ${promoted.count} leads → Phase 32 (WA + Website)`);
  console.log(`\n  Phase 3  (USA all)          : ${total3}`);
  console.log(`  Phase 32 (USA WA + Website) : ${total32}`);
  console.log(`\nDone. Phase 32 leads are ready for the WhatsApp campaign.`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
