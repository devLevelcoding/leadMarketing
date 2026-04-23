#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const SCRAPER_DIR = path.join(__dirname, "../../scraper");

// Phase 1 — Europe (folder-based, multiple CSVs per folder)
const PHASE1_SOURCES = [
  { folder: "phase1/crm_leads",     domain: "crm"        },
  { folder: "phase1/leads",         domain: "no_website" },
  { folder: "phase1/health_leads",  domain: "health"     },
  { folder: "phase1/b2b_leads",     domain: "b2b"        },
  { folder: "phase1/tourism_leads", domain: "tourism"    },
];

// Phase 2 — Dubai/UAE (single CSV per segment)
const PHASE2_SOURCES = [
  { file: "phase2/leads/dubai_b2b.csv",        domain: "b2b"        },
  { file: "phase2/leads/dubai_health.csv",      domain: "health"     },
  { file: "phase2/leads/dubai_no_website.csv",  domain: "no_website" },
  { file: "phase2/leads/dubai_retail.csv",      domain: "crm"        },
  { file: "phase2/leads/dubai_tourism.csv",     domain: "tourism"    },
];

// Phase 3 — USA (single CSV per segment)
const PHASE3_SOURCES = [
  { file: "phase3/leads/usa_b2b.csv",        domain: "b2b"        },
  { file: "phase3/leads/usa_health.csv",      domain: "health"     },
  { file: "phase3/leads/usa_no_website.csv",  domain: "no_website" },
  { file: "phase3/leads/usa_retail.csv",      domain: "crm"        },
  { file: "phase3/leads/usa_tourism.csv",     domain: "tourism"    },
];

async function importFolder(folder: string, domain: string, phase: number) {
  const dir = path.join(SCRAPER_DIR, folder);
  if (!fs.existsSync(dir)) {
    console.log(`  Folder not found: ${dir}`);
    return 0;
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".csv"));
  let total = 0;
  for (const file of files) {
    const rows = parse(fs.readFileSync(path.join(dir, file), "utf-8"), {
      columns: true, skip_empty_lines: true,
    });
    for (const row of rows) {
      const existing = await prisma.lead.findFirst({
        where: { name: row.name, domain, city: row.city },
      });
      if (existing) continue;
      await prisma.lead.create({
        data: {
          name: row.name || "", category: row.category || null,
          searchCategory: row.search_category || null, address: row.address || null,
          phone: row.phone || null, website: row.website || null,
          rating: row.rating || null, reviewCount: row.review_count || null,
          city: row.city || null, state: row.state || null,
          country: row.country || null, mapsUrl: row.maps_url || null,
          scrapedAt: row.scraped_at || null, domain, phase, status: "NEW",
        },
      });
      total++;
    }
    console.log(`  ${file}: ${rows.length} rows`);
  }
  return total;
}

async function importFile(file: string, domain: string, phase: number) {
  const filePath = path.join(SCRAPER_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return 0;
  }
  const rows = parse(fs.readFileSync(filePath, "utf-8"), {
    columns: true, skip_empty_lines: true,
  });
  let total = 0;
  for (const row of rows) {
    const existing = await prisma.lead.findFirst({
      where: { name: row.name, domain, city: row.city },
    });
    if (existing) continue;
    await prisma.lead.create({
      data: {
        name: row.name || "", category: row.category || null,
        searchCategory: row.search_category || null, address: row.address || null,
        phone: row.phone || null, website: row.website || null,
        rating: row.rating || null, reviewCount: row.review_count || null,
        city: row.city || null, state: row.state || null,
        country: row.country || null, mapsUrl: row.maps_url || null,
        scrapedAt: row.scraped_at || null, domain, phase, status: "NEW",
      },
    });
    total++;
  }
  console.log(`  ${path.basename(file)}: ${rows.length} rows`);
  return total;
}

async function tagExistingPhase1() {
  const updated = await prisma.lead.updateMany({
    where: { phase: 0 },
    data: { phase: 1 },
  });
  if (updated.count > 0) console.log(`  Tagged ${updated.count} existing leads as Phase 1`);
}

async function seedTemplates() {
  const count = await prisma.emailTemplate.count();
  if (count > 0) return;

  const templates = [
    {
      name: "IT Services - English", language: "en", domain: null,
      subject: "IT Services Partnership — LevelCoding",
      body: `Hello,\n\nMy name is Marian Pirvan and I represent LevelCoding. We are an IT-services company specialising in web development, cloud solutions, CRM systems, and AI integrations.\n\nI noticed {{company_name}} and believe we could add real value to your business with modern tech solutions tailored to your needs.\n\nIf you'd be interested in a quick chat or want to learn more, feel free to visit our website or reply to this email.\n\nBest regards,\nMarian Pirvan\nLevelCoding\nmarian.pirvan@artgames.ro`,
    },
    {
      name: "CRM Pitch - English", language: "en", domain: "crm",
      subject: "Grow your customer base — CRM for {{company_name}}",
      body: `Hello,\n\nMy name is Marian Pirvan from LevelCoding. I came across {{company_name}} and I'd love to share how a modern CRM system could help you manage your customers, send automated follow-ups, and build a loyalty programme.\n\nWith over 10 years of CRM experience, we've helped businesses like yours turn one-time customers into loyal regulars.\n\nWould you have 15 minutes for a quick call?\n\nBest regards,\nMarian Pirvan\nLevelCoding\nmarian.pirvan@artgames.ro`,
    },
    {
      name: "Web Development - English", language: "en", domain: "no_website",
      subject: "Get online — Website for {{company_name}}",
      body: `Hello,\n\nMy name is Marian Pirvan from LevelCoding. I noticed that {{company_name}} doesn't yet have a website, and in today's market, an online presence can make a huge difference.\n\nWe build professional, affordable websites for small businesses — ready in days, not months.\n\nInterested? I'd be happy to send you some examples and pricing.\n\nBest regards,\nMarian Pirvan\nLevelCoding\nmarian.pirvan@artgames.ro`,
    },
    {
      name: "Health & Wellness - English", language: "en", domain: "health",
      subject: "Booking & client management for {{company_name}}",
      body: `Hello,\n\nMy name is Marian Pirvan from LevelCoding. We help health and wellness businesses like {{company_name}} streamline their bookings, automate client reminders, and build loyal customer relationships through smart software.\n\nIf managing appointments and follow-ups takes up too much of your time, we'd love to show you a better way.\n\nBest regards,\nMarian Pirvan\nLevelCoding\nmarian.pirvan@artgames.ro`,
    },
    {
      name: "B2B Services - English", language: "en", domain: "b2b",
      subject: "IT & digital transformation for {{company_name}}",
      body: `Hello,\n\nMy name is Marian Pirvan from LevelCoding. We work with professional services firms like {{company_name}} to modernise their IT infrastructure, move to the cloud, and introduce AI-powered tools that save time and reduce costs.\n\nIf you're looking to improve your digital operations, I'd be glad to arrange a brief consultation.\n\nBest regards,\nMarian Pirvan\nLevelCoding\nmarian.pirvan@artgames.ro`,
    },
    {
      name: "Tourism & Hospitality - English", language: "en", domain: "tourism",
      subject: "Booking system & CRM for {{company_name}}",
      body: `Hello,\n\nMy name is Marian Pirvan from LevelCoding. We help accommodation and tour businesses like {{company_name}} increase bookings with professional websites, online booking systems, and automated guest communication tools.\n\nWould you be open to a quick chat about how we could help you get more direct bookings?\n\nBest regards,\nMarian Pirvan\nLevelCoding\nmarian.pirvan@artgames.ro`,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.create({ data: t });
  }
  console.log(`  Seeded ${templates.length} email templates`);
}

async function main() {
  console.log("🚀 Importing leads...\n");
  let grand = 0;

  // Ensure existing leads are tagged as Phase 1
  await tagExistingPhase1();

  console.log("📂 PHASE 1 — Europe");
  for (const { folder, domain } of PHASE1_SOURCES) {
    console.log(`  ${domain.toUpperCase()} (${folder})`);
    grand += await importFolder(folder, domain, 1);
  }

  console.log("\n📂 PHASE 2 — Dubai / UAE");
  for (const { file, domain } of PHASE2_SOURCES) {
    console.log(`  ${domain.toUpperCase()}`);
    grand += await importFile(file, domain, 2);
  }

  console.log("\n📂 PHASE 3 — USA");
  for (const { file, domain } of PHASE3_SOURCES) {
    console.log(`  ${domain.toUpperCase()}`);
    grand += await importFile(file, domain, 3);
  }

  console.log("\n📧 Seeding email templates...");
  await seedTemplates();

  const total = await prisma.lead.count();
  console.log(`\n✅ Done! ${grand} new leads imported. Total in DB: ${total}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
