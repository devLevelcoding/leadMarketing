#!/usr/bin/env tsx
/**
 * Google Maps scraper — outputs CSV files compatible with import-leads.ts
 * Usage: npx tsx scripts/scrape-gmaps.ts
 *        npx tsx scripts/scrape-gmaps.ts --country Netherlands --limit 200
 */

import { chromium } from "playwright";
import { writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";

// ─── Progress bar ─────────────────────────────────────────────────────────────

function bar(done: number, total: number, width = 28): string {
  const pct  = total > 0 ? done / total : 0;
  const fill = Math.round(pct * width);
  return `[${"█".repeat(fill)}${"░".repeat(width - fill)}] ${done}/${total} (${Math.round(pct * 100)}%)`;
}

function eta(startMs: number, done: number, total: number): string {
  if (done === 0) return "ETA --:--";
  const elapsed  = (Date.now() - startMs) / 1000;
  const secLeft  = Math.round((elapsed / done) * (total - done));
  const m = Math.floor(secLeft / 60);
  const s = secLeft % 60;
  return `ETA ${m}m${s.toString().padStart(2, "0")}s`;
}

function printProgress(label: string, done: number, total: number, startMs: number) {
  process.stdout.write(`\r  ${label.padEnd(40)} ${bar(done, total)} ${eta(startMs, done, total)}  `);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const OUTPUT_DIR = join(__dirname, "../../scraper/phase4");
const RESULTS_PER_SEARCH = 120; // Google Maps caps at ~120 per query
const DETAIL_DELAY_MS    = 800; // delay between clicking each result
const SCROLL_DELAY_MS    = 1200;

// ─── Search targets ───────────────────────────────────────────────────────────

interface Target {
  country: string;
  city: string;
  query: string;       // Google Maps search string
  searchCategory: string;
  niche: string;       // used for output filename
  domain: "b2b" | "crm" | "health" | "tourism" | "no_website";
}

const TARGETS: Target[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // NETHERLANDS — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Netherlands", city: "Amsterdam",  query: "restaurant Amsterdam",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Amsterdam",  query: "kapsalon Amsterdam",               searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Amsterdam",  query: "fysiotherapeut Amsterdam",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Amsterdam",  query: "tandarts Amsterdam",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Amsterdam",  query: "accountant Amsterdam",             searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Netherlands", city: "Rotterdam",  query: "restaurant Rotterdam",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Rotterdam",  query: "kapsalon Rotterdam",               searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Rotterdam",  query: "fysiotherapeut Rotterdam",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Rotterdam",  query: "tandarts Rotterdam",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Rotterdam",  query: "accountant Rotterdam",             searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Netherlands", city: "Utrecht",    query: "restaurant Utrecht",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Utrecht",    query: "kapsalon Utrecht",                 searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Utrecht",    query: "fysiotherapeut Utrecht",           searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Utrecht",    query: "tandarts Utrecht",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Den Haag",   query: "restaurant Den Haag",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Den Haag",   query: "kapsalon Den Haag",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Den Haag",   query: "fysiotherapeut Den Haag",          searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Den Haag",   query: "tandarts Den Haag",                searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Eindhoven",  query: "restaurant Eindhoven",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Eindhoven",  query: "kapsalon Eindhoven",               searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Eindhoven",  query: "fysiotherapeut Eindhoven",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Eindhoven",  query: "tandarts Eindhoven",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Netherlands", city: "Tilburg",    query: "restaurant Tilburg",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Groningen",  query: "restaurant Groningen",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Netherlands", city: "Breda",      query: "restaurant Breda",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",   query: "restaurant Brussels",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Brussels",   query: "coiffeur Brussels",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Brussels",   query: "kinésithérapeute Brussels",        searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Brussels",   query: "dentiste Brussels",                searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Brussels",   query: "comptable Brussels",               searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Belgium",     city: "Antwerp",    query: "restaurant Antwerp",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Antwerp",    query: "kapsalon Antwerp",                 searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Antwerp",    query: "fysiotherapeut Antwerp",           searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Antwerp",    query: "tandarts Antwerp",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Antwerp",    query: "accountant Antwerp",               searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Belgium",     city: "Ghent",      query: "restaurant Ghent",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Ghent",      query: "kapsalon Ghent",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Ghent",      query: "fysiotherapeut Ghent",             searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Ghent",      query: "tandarts Ghent",                   searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Bruges",     query: "restaurant Bruges",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Bruges",     query: "coiffeur Bruges",                  searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Bruges",     query: "kinésithérapeute Bruges",          searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Bruges",     query: "dentiste Bruges",                  searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Liège",      query: "restaurant Liège",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Liège",      query: "coiffeur Liège",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Liège",      query: "kinésithérapeute Liège",           searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Liège",      query: "dentiste Liège",                   searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Belgium",     city: "Namur",      query: "restaurant Namur",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Leuven",     query: "restaurant Leuven",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Belgium",     city: "Charleroi",  query: "restaurant Charleroi",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",     query: "Restaurant Berlin",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Berlin",     query: "Friseur Berlin",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Berlin",     query: "Physiotherapie Berlin",            searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Berlin",     query: "Zahnarzt Berlin",                  searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Berlin",     query: "Steuerberater Berlin",             searchCategory: "Tax Advisor",         niche: "professional_services", domain: "b2b"    },
  { country: "Germany",     city: "Munich",     query: "Restaurant München",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Munich",     query: "Friseur München",                  searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Munich",     query: "Physiotherapie München",           searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Munich",     query: "Zahnarzt München",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Munich",     query: "Steuerberater München",            searchCategory: "Tax Advisor",         niche: "professional_services", domain: "b2b"    },
  { country: "Germany",     city: "Hamburg",    query: "Restaurant Hamburg",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Hamburg",    query: "Friseur Hamburg",                  searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Hamburg",    query: "Physiotherapie Hamburg",           searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Hamburg",    query: "Zahnarzt Hamburg",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Frankfurt",  query: "Restaurant Frankfurt",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Frankfurt",  query: "Friseur Frankfurt",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Frankfurt",  query: "Physiotherapie Frankfurt",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Frankfurt",  query: "Zahnarzt Frankfurt",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Cologne",    query: "Restaurant Köln",                  searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Cologne",    query: "Friseur Köln",                     searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Cologne",    query: "Zahnarzt Köln",                    searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Stuttgart",  query: "Restaurant Stuttgart",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Stuttgart",  query: "Physiotherapie Stuttgart",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Germany",     city: "Düsseldorf", query: "Restaurant Düsseldorf",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Germany",     city: "Leipzig",    query: "Restaurant Leipzig",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // SWITZERLAND — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Switzerland", city: "Zurich",     query: "Restaurant Zürich",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Zurich",     query: "Coiffeur Zürich",                  searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Zurich",     query: "Physiotherapie Zürich",            searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Zurich",     query: "Zahnarzt Zürich",                  searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Zurich",     query: "Treuhänder Zürich",                searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Switzerland", city: "Geneva",     query: "Restaurant Genève",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Geneva",     query: "Coiffeur Genève",                  searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Geneva",     query: "Physiothérapeute Genève",          searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Geneva",     query: "Dentiste Genève",                  searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Geneva",     query: "Fiduciaire Genève",                searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Switzerland", city: "Basel",      query: "Restaurant Basel",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Basel",      query: "Coiffeur Basel",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Basel",      query: "Physiotherapie Basel",             searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Basel",      query: "Zahnarzt Basel",                   searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Bern",       query: "Restaurant Bern",                  searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Bern",       query: "Coiffeur Bern",                    searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Bern",       query: "Physiotherapie Bern",              searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Bern",       query: "Zahnarzt Bern",                    searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Lausanne",   query: "Restaurant Lausanne",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Lausanne",   query: "Coiffeur Lausanne",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Lausanne",   query: "Physiothérapeute Lausanne",        searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Lausanne",   query: "Dentiste Lausanne",                searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "Winterthur", query: "Restaurant Winterthur",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Switzerland", city: "Winterthur", query: "Zahnarzt Winterthur",              searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Switzerland", city: "St. Gallen", query: "Restaurant St. Gallen",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",     query: "Restaurant Wien",                  searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Vienna",     query: "Friseur Wien",                     searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Vienna",     query: "Physiotherapie Wien",              searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Vienna",     query: "Zahnarzt Wien",                    searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Vienna",     query: "Steuerberater Wien",               searchCategory: "Tax Advisor",         niche: "professional_services", domain: "b2b"    },
  { country: "Austria",     city: "Graz",       query: "Restaurant Graz",                  searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Graz",       query: "Friseur Graz",                     searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Graz",       query: "Physiotherapie Graz",              searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Graz",       query: "Zahnarzt Graz",                    searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Graz",       query: "Steuerberater Graz",               searchCategory: "Tax Advisor",         niche: "professional_services", domain: "b2b"    },
  { country: "Austria",     city: "Linz",       query: "Restaurant Linz",                  searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Linz",       query: "Friseur Linz",                     searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Linz",       query: "Physiotherapie Linz",              searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Linz",       query: "Zahnarzt Linz",                    searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Salzburg",   query: "Restaurant Salzburg",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Salzburg",   query: "Friseur Salzburg",                 searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Salzburg",   query: "Physiotherapie Salzburg",          searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Salzburg",   query: "Zahnarzt Salzburg",                searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Innsbruck",  query: "Restaurant Innsbruck",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Innsbruck",  query: "Friseur Innsbruck",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Innsbruck",  query: "Zahnarzt Innsbruck",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Klagenfurt", query: "Restaurant Klagenfurt",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "Klagenfurt", query: "Zahnarzt Klagenfurt",              searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Austria",     city: "Villach",    query: "Restaurant Villach",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Austria",     city: "St. Pölten", query: "Restaurant St. Pölten",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // DENMARK — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Denmark",     city: "Copenhagen", query: "restaurant København",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Copenhagen", query: "frisør København",                 searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Copenhagen", query: "fysioterapeut København",          searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Copenhagen", query: "tandlæge København",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Copenhagen", query: "revisor København",                searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Denmark",     city: "Aarhus",     query: "restaurant Aarhus",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Aarhus",     query: "frisør Aarhus",                    searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Aarhus",     query: "fysioterapeut Aarhus",             searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Aarhus",     query: "tandlæge Aarhus",                  searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Aarhus",     query: "revisor Aarhus",                   searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Denmark",     city: "Odense",     query: "restaurant Odense",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Odense",     query: "frisør Odense",                    searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Odense",     query: "fysioterapeut Odense",             searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Odense",     query: "tandlæge Odense",                  searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Aalborg",    query: "restaurant Aalborg",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Aalborg",    query: "frisør Aalborg",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Aalborg",    query: "fysioterapeut Aalborg",            searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Aalborg",    query: "tandlæge Aalborg",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Esbjerg",    query: "restaurant Esbjerg",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Esbjerg",    query: "tandlæge Esbjerg",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Denmark",     city: "Randers",    query: "restaurant Randers",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Kolding",    query: "restaurant Kolding",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Horsens",    query: "restaurant Horsens",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Roskilde",   query: "restaurant Roskilde",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Denmark",     city: "Vejle",      query: "restaurant Vejle",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // SWEDEN — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Sweden",      city: "Stockholm",  query: "restaurant Stockholm",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Stockholm",  query: "frisör Stockholm",                 searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Stockholm",  query: "sjukgymnast Stockholm",            searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Stockholm",  query: "tandläkare Stockholm",             searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Stockholm",  query: "redovisningskonsult Stockholm",    searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Sweden",      city: "Gothenburg", query: "restaurant Göteborg",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Gothenburg", query: "frisör Göteborg",                  searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Gothenburg", query: "sjukgymnast Göteborg",             searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Gothenburg", query: "tandläkare Göteborg",              searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Gothenburg", query: "redovisningskonsult Göteborg",     searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Sweden",      city: "Malmö",      query: "restaurant Malmö",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Malmö",      query: "frisör Malmö",                     searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Malmö",      query: "sjukgymnast Malmö",                searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Malmö",      query: "tandläkare Malmö",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Uppsala",    query: "restaurant Uppsala",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Uppsala",    query: "frisör Uppsala",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Uppsala",    query: "sjukgymnast Uppsala",              searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Uppsala",    query: "tandläkare Uppsala",               searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Västerås",   query: "restaurant Västerås",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Västerås",   query: "tandläkare Västerås",              searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Örebro",     query: "restaurant Örebro",                searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Örebro",     query: "tandläkare Örebro",                searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Sweden",      city: "Linköping",  query: "restaurant Linköping",             searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Helsingborg",query: "restaurant Helsingborg",           searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Sweden",      city: "Norrköping", query: "restaurant Norrköping",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // NORWAY — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Norway",      city: "Oslo",        query: "restaurant Oslo",                 searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Oslo",        query: "frisør Oslo",                     searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Oslo",        query: "fysioterapeut Oslo",              searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Oslo",        query: "tannlege Oslo",                   searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Oslo",        query: "regnskapsfører Oslo",             searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Norway",      city: "Bergen",      query: "restaurant Bergen",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Bergen",      query: "frisør Bergen",                   searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Bergen",      query: "fysioterapeut Bergen",            searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Bergen",      query: "tannlege Bergen",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Bergen",      query: "regnskapsfører Bergen",           searchCategory: "Accountant",          niche: "professional_services", domain: "b2b"    },
  { country: "Norway",      city: "Trondheim",   query: "restaurant Trondheim",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Trondheim",   query: "frisør Trondheim",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Trondheim",   query: "fysioterapeut Trondheim",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Trondheim",   query: "tannlege Trondheim",              searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Stavanger",   query: "restaurant Stavanger",            searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Stavanger",   query: "frisør Stavanger",                searchCategory: "Hair Salon",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Stavanger",   query: "fysioterapeut Stavanger",         searchCategory: "Physiotherapy",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Stavanger",   query: "tannlege Stavanger",              searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Kristiansand",query: "restaurant Kristiansand",         searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Kristiansand",query: "tannlege Kristiansand",           searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Tromsø",      query: "restaurant Tromsø",               searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Tromsø",      query: "tannlege Tromsø",                 searchCategory: "Dental Clinic",       niche: "health",                domain: "health" },
  { country: "Norway",      city: "Fredrikstad", query: "restaurant Fredrikstad",          searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Drammen",     query: "restaurant Drammen",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
  { country: "Norway",      city: "Sandnes",     query: "restaurant Sandnes",              searchCategory: "Restaurant",          niche: "restaurants",           domain: "crm"    },
];

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_HEADER = "name,category,search_category,address,phone,website,rating,review_count,city,country,maps_url,scraped_at\n";

function escCsv(v: string | null): string {
  if (!v) return "";
  const s = v.replace(/"/g, '""');
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
}

function toRow(r: Record<string, string | null>): string {
  return [
    r.name, r.category, r.search_category, r.address,
    r.phone, r.website, r.rating, r.review_count,
    r.city, r.country, r.maps_url, r.scraped_at,
  ].map(escCsv).join(",") + "\n";
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}


// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const filterCountry = args.includes("--country") ? args[args.indexOf("--country") + 1] : null;
  const limitArg      = args.includes("--limit")   ? parseInt(args[args.indexOf("--limit") + 1]) : RESULTS_PER_SEARCH;

  const targets = filterCountry
    ? TARGETS.filter(t => t.country.toLowerCase() === filterCountry.toLowerCase())
    : TARGETS;

  console.log(`\n🗺  Google Maps Scraper — LevelCoding`);
  console.log(`   Targets : ${targets.length} searches`);
  console.log(`   Limit   : ${limitArg} per search`);
  console.log(`   Output  : ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const headless = !args.includes("--visible");
  const browser = await chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-GB",
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  // Group by output file (country_niche.csv)
  const fileMap: Record<string, { targets: Target[]; domain: string }> = {};
  for (const t of targets) {
    const key = `${t.country.toLowerCase().replace(/ /g, "_")}_${t.niche}`;
    if (!fileMap[key]) fileMap[key] = { targets: [], domain: t.domain };
    fileMap[key].targets.push(t);
  }

  let grandTotal = 0;

  for (const [fileKey, { targets: group, domain }] of Object.entries(fileMap)) {
    const csvPath = join(OUTPUT_DIR, `${fileKey}.csv`);
    writeFileSync(csvPath, CSV_HEADER);
    console.log(`\n📁 ${fileKey}.csv  (domain: ${domain})`);

    let fileTotal = 0;

    for (const target of group) {
      // Re-use same page, scrape target
      const url = `https://www.google.com/maps/search/${encodeURIComponent(target.query)}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await delay(2000);

      const cookieBtn = page.locator('button:has-text("Accept all"), button:has-text("Accepteer"), button:has-text("Alle akzeptieren"), button:has-text("Accepter"), button:has-text("Accepter tout")');
      if (await cookieBtn.count() > 0) {
        await cookieBtn.first().click();
        await delay(1000);
      }

      const feed = page.locator('[role="feed"]');
      try { await feed.waitFor({ timeout: 15000 }); }
      catch { console.log("    ⚠ No feed — skipping"); continue; }

      let prevCount = 0;
      for (let s = 0; s < 15; s++) {
        await feed.evaluate(el => el.scrollBy(0, 1200));
        await delay(SCROLL_DELAY_MS);
        const count = await page.locator('[role="feed"] [role="article"]').count();
        if (count >= limitArg || count === prevCount) break;
        prevCount = count;
      }

      const articles = page.locator('[role="feed"] [role="article"]');
      const total = Math.min(await articles.count(), limitArg);
      console.log(`  🔍 ${target.query} → ${total} results`);

      const scrapedAt = new Date().toISOString().slice(0, 10);
      const startMs = Date.now();

      for (let i = 0; i < total; i++) {
        try {
          const article = articles.nth(i);
          await article.scrollIntoViewIfNeeded();
          await article.click();
          await delay(DETAIL_DELAY_MS);

          const name     = await page.locator('h1').first().textContent().catch(() => null);
          if (!name?.trim()) continue;

          const category = await page.locator('button[jsaction*="category"]').first().textContent().catch(() => null);
          const address  = await page.locator('[data-item-id="address"] .fontBodyMedium').first().textContent().catch(() => null);
          const phone    = await page.locator('[data-item-id*="phone"] .fontBodyMedium').first().textContent().catch(() => null);
          const website  = await page.locator('a[data-item-id*="authority"]').first().getAttribute("href").catch(() => null);
          const rating   = await page.locator('.fontDisplayLarge').first().textContent().catch(() => null);
          const reviews  = await page.locator('[aria-label*="reviews"]').first().getAttribute("aria-label").catch(() => null);
          const mapsUrl  = page.url().includes("/place/") ? page.url().split("?")[0] : null;

          const reviewCount = reviews ? reviews.match(/[\d,]+/)?.[0]?.replace(",", "") ?? null : null;

          appendFileSync(csvPath, toRow({
            name:            name.trim(),
            category:        category?.trim() ?? target.searchCategory,
            search_category: target.searchCategory,
            address:         address?.trim() ?? null,
            phone:           phone?.trim() ?? null,
            website:         website ?? null,
            rating:          rating?.trim().replace(",", ".") ?? null,
            review_count:    reviewCount,
            city:            target.city,
            country:         target.country,
            maps_url:        mapsUrl,
            scraped_at:      scrapedAt,
          }));

          fileTotal++;
          printProgress(target.query.slice(0, 38), i + 1, total, startMs);
        } catch { /* skip */ }
      }
      process.stdout.write("\n");
      console.log(`    ✓ ${fileTotal} leads in file so far`);
    }

    grandTotal += fileTotal;
    console.log(`  ✅ ${fileKey}.csv — ${fileTotal} leads`);
  }

  await browser.close();
  console.log(`\n✅ Done — ${grandTotal} total leads`);
  console.log(`📂 Output: ${OUTPUT_DIR}`);
  console.log(`\nNext step: npx tsx scripts/import-leads.ts`);
}

main().catch(err => { console.error(err); process.exit(1); });
