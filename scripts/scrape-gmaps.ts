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

const RESULTS_PER_SEARCH = 20;  // cap at 20 per query — enough leads, much faster
const DETAIL_DELAY_MS    = 300; // delay between clicking each result
const SCROLL_DELAY_MS    = 400;

// ─── Search targets ───────────────────────────────────────────────────────────

interface Target {
  country: string;
  city: string;
  state?: string;      // US state abbreviation
  query: string;       // Google Maps search string
  searchCategory: string;
  niche: string;       // used for output filename
  domain: "b2b" | "crm" | "health" | "tourism" | "no_website";
  phase?: number;      // 3 = USA, 4 = DACH/Benelux, 5 = South/East Europe (default 4)
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

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — Law Firms — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Rechtsanwalt Berlin",             searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Berlin",      query: "Anwaltskanzlei Berlin",           searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Munich",      query: "Rechtsanwalt München",            searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Munich",      query: "Anwaltskanzlei München",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Hamburg",     query: "Rechtsanwalt Hamburg",            searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Hamburg",     query: "Anwaltskanzlei Hamburg",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Frankfurt",   query: "Rechtsanwalt Frankfurt",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Frankfurt",   query: "Anwaltskanzlei Frankfurt",        searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Cologne",     query: "Rechtsanwalt Köln",               searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Stuttgart",   query: "Rechtsanwalt Stuttgart",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Düsseldorf",  query: "Rechtsanwalt Düsseldorf",         searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Leipzig",     query: "Rechtsanwalt Leipzig",            searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Germany",     city: "Dortmund",    query: "Rechtsanwalt Dortmund",           searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — Auto Workshops — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Autowerkstatt Berlin",            searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Berlin",      query: "KFZ Werkstatt Berlin",            searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Munich",      query: "Autowerkstatt München",           searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Munich",      query: "KFZ Werkstatt München",           searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Hamburg",     query: "Autowerkstatt Hamburg",           searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Hamburg",     query: "KFZ Werkstatt Hamburg",           searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Frankfurt",   query: "Autowerkstatt Frankfurt",         searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Cologne",     query: "Autowerkstatt Köln",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Stuttgart",   query: "Autowerkstatt Stuttgart",         searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Düsseldorf",  query: "Autowerkstatt Düsseldorf",        searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Leipzig",     query: "Autowerkstatt Leipzig",           searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Germany",     city: "Dortmund",    query: "Autowerkstatt Dortmund",          searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — Law Firms — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",    query: "cabinet avocat Brussels",         searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Brussels",    query: "advocatenkantoor Brussel",        searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Antwerp",     query: "advocatenkantoor Antwerp",        searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Antwerp",     query: "cabinet avocat Antwerp",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Ghent",       query: "advocatenkantoor Ghent",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Liège",       query: "cabinet avocat Liège",            searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Bruges",      query: "advocatenkantoor Bruges",         searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Namur",       query: "cabinet avocat Namur",            searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Leuven",      query: "advocatenkantoor Leuven",         searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Belgium",     city: "Charleroi",   query: "cabinet avocat Charleroi",        searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — Auto Workshops — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",    query: "garage automobile Brussels",      searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Brussels",    query: "autogarage Brussel",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Antwerp",     query: "autogarage Antwerp",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Antwerp",     query: "garage automobile Antwerp",       searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Ghent",       query: "autogarage Ghent",                searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Liège",       query: "garage automobile Liège",         searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Bruges",      query: "autogarage Bruges",               searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Namur",       query: "garage automobile Namur",         searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Leuven",      query: "autogarage Leuven",               searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Belgium",     city: "Charleroi",   query: "garage automobile Charleroi",     searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — Law Firms — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",      query: "Rechtsanwalt Wien",               searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Vienna",      query: "Anwaltskanzlei Wien",             searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Graz",        query: "Rechtsanwalt Graz",               searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Graz",        query: "Anwaltskanzlei Graz",             searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Linz",        query: "Rechtsanwalt Linz",               searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Salzburg",    query: "Rechtsanwalt Salzburg",           searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Innsbruck",   query: "Rechtsanwalt Innsbruck",          searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Klagenfurt",  query: "Rechtsanwalt Klagenfurt",         searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "Villach",     query: "Rechtsanwalt Villach",            searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },
  { country: "Austria",     city: "St. Pölten",  query: "Rechtsanwalt St. Pölten",         searchCategory: "Law Firm",            niche: "law_firms",             domain: "b2b"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — Auto Workshops — 25 queries × 20 results = 500 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",      query: "Autowerkstatt Wien",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Vienna",      query: "KFZ Werkstatt Wien",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Graz",        query: "Autowerkstatt Graz",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Graz",        query: "KFZ Werkstatt Graz",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Linz",        query: "Autowerkstatt Linz",              searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Salzburg",    query: "Autowerkstatt Salzburg",          searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Innsbruck",   query: "Autowerkstatt Innsbruck",         searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Klagenfurt",  query: "Autowerkstatt Klagenfurt",        searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "Villach",     query: "Autowerkstatt Villach",           searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },
  { country: "Austria",     city: "St. Pölten",  query: "Autowerkstatt St. Pölten",        searchCategory: "Auto Workshop",       niche: "auto_workshops",        domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — Fitness / Gyms — ~300 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Fitnessstudio Berlin",            searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Munich",      query: "Fitnessstudio München",           searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Hamburg",     query: "Fitnessstudio Hamburg",           searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Frankfurt",   query: "Fitnessstudio Frankfurt",         searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Cologne",     query: "Fitnessstudio Köln",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Stuttgart",   query: "Fitnessstudio Stuttgart",         searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Düsseldorf",  query: "Fitnessstudio Düsseldorf",        searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Leipzig",     query: "Fitnessstudio Leipzig",           searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Dortmund",    query: "Fitnessstudio Dortmund",          searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Germany",     city: "Essen",       query: "Fitnessstudio Essen",             searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — Veterinary Clinics — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Tierarzt Berlin",                 searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Munich",      query: "Tierarzt München",                searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Hamburg",     query: "Tierarzt Hamburg",                searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Frankfurt",   query: "Tierarzt Frankfurt",              searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Cologne",     query: "Tierarzt Köln",                   searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Stuttgart",   query: "Tierarzt Stuttgart",              searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Düsseldorf",  query: "Tierarzt Düsseldorf",             searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Germany",     city: "Leipzig",     query: "Tierarzt Leipzig",                searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — Architecture Firms — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Architekturbüro Berlin",          searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Munich",      query: "Architekturbüro München",         searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Hamburg",     query: "Architekturbüro Hamburg",         searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Frankfurt",   query: "Architekturbüro Frankfurt",       searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Cologne",     query: "Architekturbüro Köln",            searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Stuttgart",   query: "Architekturbüro Stuttgart",       searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Düsseldorf",  query: "Architekturbüro Düsseldorf",      searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Germany",     city: "Leipzig",     query: "Architekturbüro Leipzig",         searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — Fitness / Gyms — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",    query: "salle de sport Brussels",         searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Antwerp",     query: "sportschool Antwerp",             searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Ghent",       query: "sportschool Ghent",               searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Liège",       query: "salle de sport Liège",            searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Bruges",      query: "sportschool Bruges",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Namur",       query: "salle de sport Namur",            searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Leuven",      query: "sportschool Leuven",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Charleroi",   query: "salle de sport Charleroi",        searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Belgium",     city: "Mons",        query: "salle de sport Mons",             searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — Veterinary Clinics — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",    query: "vétérinaire Brussels",            searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Antwerp",     query: "dierenarts Antwerp",              searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Ghent",       query: "dierenarts Ghent",                searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Liège",       query: "vétérinaire Liège",               searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Bruges",      query: "dierenarts Bruges",               searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Namur",       query: "vétérinaire Namur",               searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Leuven",      query: "dierenarts Leuven",               searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Belgium",     city: "Charleroi",   query: "vétérinaire Charleroi",           searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — Architecture Firms — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",    query: "cabinet architecture Brussels",   searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Antwerp",     query: "architectenbureau Antwerp",       searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Ghent",       query: "architectenbureau Ghent",         searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Liège",       query: "cabinet architecture Liège",      searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Bruges",      query: "architectenbureau Bruges",        searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Namur",       query: "cabinet architecture Namur",      searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Leuven",      query: "architectenbureau Leuven",        searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Belgium",     city: "Charleroi",   query: "cabinet architecture Charleroi",  searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — Fitness / Gyms — ~300 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",      query: "Fitnessstudio Wien",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Graz",        query: "Fitnessstudio Graz",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Linz",        query: "Fitnessstudio Linz",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Salzburg",    query: "Fitnessstudio Salzburg",          searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Innsbruck",   query: "Fitnessstudio Innsbruck",         searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Klagenfurt",  query: "Fitnessstudio Klagenfurt",        searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Villach",     query: "Fitnessstudio Villach",           searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "St. Pölten",  query: "Fitnessstudio St. Pölten",        searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Wels",        query: "Fitnessstudio Wels",              searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },
  { country: "Austria",     city: "Bregenz",     query: "Fitnessstudio Bregenz",           searchCategory: "Gym",                 niche: "fitness",               domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — Veterinary Clinics — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",      query: "Tierarzt Wien",                   searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "Graz",        query: "Tierarzt Graz",                   searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "Linz",        query: "Tierarzt Linz",                   searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "Salzburg",    query: "Tierarzt Salzburg",               searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "Innsbruck",   query: "Tierarzt Innsbruck",              searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "Klagenfurt",  query: "Tierarzt Klagenfurt",             searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "Villach",     query: "Tierarzt Villach",                searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },
  { country: "Austria",     city: "St. Pölten",  query: "Tierarzt St. Pölten",             searchCategory: "Veterinary Clinic",   niche: "veterinary",            domain: "health" },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMANY — Nail / Beauty Studios — ~300 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Nagelstudio Berlin",              searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Munich",      query: "Nagelstudio München",             searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Hamburg",     query: "Nagelstudio Hamburg",             searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Frankfurt",   query: "Nagelstudio Frankfurt",           searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Cologne",     query: "Nagelstudio Köln",                searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Stuttgart",   query: "Nagelstudio Stuttgart",           searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Düsseldorf",  query: "Nagelstudio Düsseldorf",          searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Leipzig",     query: "Nagelstudio Leipzig",             searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Dortmund",    query: "Nagelstudio Dortmund",            searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Germany",     city: "Essen",       query: "Nagelstudio Essen",               searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // BELGIUM — Beauty / Nail Salons — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Belgium",     city: "Brussels",    query: "institut de beauté Brussels",     searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Antwerp",     query: "nagelstudio Antwerp",             searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Ghent",       query: "nagelstudio Ghent",               searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Liège",       query: "institut de beauté Liège",        searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Bruges",      query: "nagelstudio Bruges",              searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Namur",       query: "institut de beauté Namur",        searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Leuven",      query: "nagelstudio Leuven",              searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Charleroi",   query: "institut de beauté Charleroi",    searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Belgium",     city: "Mons",        query: "institut de beauté Mons",         searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — Nail / Beauty Studios — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",      query: "Nagelstudio Wien",                searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "Graz",        query: "Nagelstudio Graz",                searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "Linz",        query: "Nagelstudio Linz",                searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "Salzburg",    query: "Nagelstudio Salzburg",            searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "Innsbruck",   query: "Nagelstudio Innsbruck",           searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "Klagenfurt",  query: "Nagelstudio Klagenfurt",          searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "Villach",     query: "Nagelstudio Villach",             searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },
  { country: "Austria",     city: "St. Pölten",  query: "Nagelstudio St. Pölten",          searchCategory: "Nail Salon",          niche: "beauty",                domain: "crm"    },

  // ══════════════════════════════════════════════════════════════════════════
  // AUSTRIA — Architecture Firms — ~250 leads
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Austria",     city: "Vienna",      query: "Architekturbüro Wien",            searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "Graz",        query: "Architekturbüro Graz",            searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "Linz",        query: "Architekturbüro Linz",            searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "Salzburg",    query: "Architekturbüro Salzburg",        searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "Innsbruck",   query: "Architekturbüro Innsbruck",       searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "Klagenfurt",  query: "Architekturbüro Klagenfurt",      searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "Villach",     query: "Architekturbüro Villach",         searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },
  { country: "Austria",     city: "St. Pölten",  query: "Architekturbüro St. Pölten",      searchCategory: "Architecture Firm",   niche: "architects",            domain: "b2b"    },

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 5 — SOUTH EUROPE
  // ══════════════════════════════════════════════════════════════════════════════

  // ── ITALY ──────────────────────────────────────────────────────────────────
  { country: "Italy", city: "Rome",     query: "ristorante Roma",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "parrucchiere Roma",         searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "fisioterapista Roma",       searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Rome",     query: "dentista Roma",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Rome",     query: "commercialista Roma",       searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "ristorante Milano",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "parrucchiere Milano",       searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "fisioterapista Milano",     searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Milan",    query: "dentista Milano",           searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Milan",    query: "commercialista Milano",     searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "ristorante Napoli",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "parrucchiere Napoli",       searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "fisioterapista Napoli",     searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Naples",   query: "dentista Napoli",           searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Turin",    query: "ristorante Torino",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "parrucchiere Torino",       searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "fisioterapista Torino",     searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Turin",    query: "dentista Torino",           searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Florence", query: "ristorante Firenze",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Florence", query: "parrucchiere Firenze",      searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Florence", query: "fisioterapista Firenze",    searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Florence", query: "dentista Firenze",          searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Italy", city: "Bologna",  query: "ristorante Bologna",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Palermo",  query: "ristorante Palermo",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Genoa",    query: "ristorante Genova",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "avvocato Roma",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "avvocato Milano",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "avvocato Napoli",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "avvocato Torino",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Florence", query: "avvocato Firenze",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Bologna",  query: "avvocato Bologna",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Palermo",  query: "avvocato Palermo",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Bari",     query: "avvocato Bari",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "officina auto Roma",        searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "officina auto Milano",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "officina auto Napoli",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "officina auto Torino",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Florence", query: "officina auto Firenze",     searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Bologna",  query: "officina auto Bologna",     searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Palermo",  query: "officina auto Palermo",     searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Bari",     query: "officina auto Bari",        searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "palestra Roma",             searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "palestra Milano",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "palestra Napoli",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "palestra Torino",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Florence", query: "palestra Firenze",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Bologna",  query: "palestra Bologna",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Palermo",  query: "palestra Palermo",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "veterinario Roma",          searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Italy", city: "Milan",    query: "veterinario Milano",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Italy", city: "Naples",   query: "veterinario Napoli",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Italy", city: "Turin",    query: "veterinario Torino",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Italy", city: "Florence", query: "veterinario Firenze",       searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Italy", city: "Bologna",  query: "veterinario Bologna",       searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Italy", city: "Rome",     query: "architetto Roma",           searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "architetto Milano",         searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "architetto Napoli",         searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "architetto Torino",         searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Florence", query: "architetto Firenze",        searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Bologna",  query: "architetto Bologna",        searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Italy", city: "Rome",     query: "centro estetico Roma",      searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Italy", city: "Milan",    query: "centro estetico Milano",    searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Italy", city: "Naples",   query: "centro estetico Napoli",    searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Italy", city: "Turin",    query: "centro estetico Torino",    searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Italy", city: "Florence", query: "centro estetico Firenze",   searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Italy", city: "Bologna",  query: "centro estetico Bologna",   searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Italy", city: "Palermo",  query: "centro estetico Palermo",   searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── SPAIN ──────────────────────────────────────────────────────────────────
  { country: "Spain", city: "Madrid",    query: "restaurante Madrid",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "peluquería Madrid",         searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "fisioterapeuta Madrid",     searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Madrid",    query: "dentista Madrid",           searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Madrid",    query: "asesor fiscal Madrid",      searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "restaurante Barcelona",     searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "peluquería Barcelona",      searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "fisioterapeuta Barcelona",  searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Barcelona", query: "dentista Barcelona",        searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Barcelona", query: "asesor fiscal Barcelona",   searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "restaurante Valencia",      searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "peluquería Valencia",       searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "fisioterapeuta Valencia",   searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Valencia",  query: "dentista Valencia",         searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Seville",   query: "restaurante Sevilla",       searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "peluquería Sevilla",        searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "fisioterapeuta Sevilla",    searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Seville",   query: "dentista Sevilla",          searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "restaurante Bilbao",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Zaragoza",  query: "restaurante Zaragoza",      searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Malaga",    query: "restaurante Málaga",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Murcia",    query: "restaurante Murcia",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "abogado Madrid",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "abogado Barcelona",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "abogado Valencia",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "abogado Sevilla",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "abogado Bilbao",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Zaragoza",  query: "abogado Zaragoza",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Malaga",    query: "abogado Málaga",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "taller mecánico Madrid",    searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "taller mecánico Barcelona", searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "taller mecánico Valencia",  searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "taller mecánico Sevilla",   searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "taller mecánico Bilbao",    searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Zaragoza",  query: "taller mecánico Zaragoza",  searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Malaga",    query: "taller mecánico Málaga",    searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "gimnasio Madrid",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "gimnasio Barcelona",        searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "gimnasio Valencia",         searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "gimnasio Sevilla",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "gimnasio Bilbao",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Spain", city: "Zaragoza",  query: "gimnasio Zaragoza",         searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "veterinario Madrid",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Spain", city: "Barcelona", query: "veterinario Barcelona",     searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Spain", city: "Valencia",  query: "veterinario Valencia",      searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Spain", city: "Seville",   query: "veterinario Sevilla",       searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "veterinario Bilbao",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Spain", city: "Malaga",    query: "veterinario Málaga",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Spain", city: "Madrid",    query: "arquitecto Madrid",         searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "arquitecto Barcelona",      searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "arquitecto Valencia",       searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "arquitecto Sevilla",        searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "arquitecto Bilbao",         searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Zaragoza",  query: "arquitecto Zaragoza",       searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Spain", city: "Madrid",    query: "centro de estética Madrid",    searchCategory: "Beauty Salon",   niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Spain", city: "Barcelona", query: "centro de estética Barcelona", searchCategory: "Beauty Salon",   niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Spain", city: "Valencia",  query: "centro de estética Valencia",  searchCategory: "Beauty Salon",   niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Spain", city: "Seville",   query: "centro de estética Sevilla",   searchCategory: "Beauty Salon",   niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Spain", city: "Bilbao",    query: "centro de estética Bilbao",    searchCategory: "Beauty Salon",   niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Spain", city: "Malaga",    query: "centro de estética Málaga",    searchCategory: "Beauty Salon",   niche: "beauty",                domain: "crm",    phase: 5 },

  // ── PORTUGAL ───────────────────────────────────────────────────────────────
  { country: "Portugal", city: "Lisbon",   query: "restaurante Lisboa",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "cabeleireiro Lisboa",       searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "fisioterapeuta Lisboa",     searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "dentista Lisboa",           searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "contabilista Lisboa",       searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "restaurante Porto",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "cabeleireiro Porto",        searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "fisioterapeuta Porto",      searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Portugal", city: "Porto",    query: "dentista Porto",            searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Portugal", city: "Porto",    query: "contabilista Porto",        searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "restaurante Braga",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "fisioterapeuta Braga",      searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "restaurante Coimbra",       searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "dentista Coimbra",          searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Portugal", city: "Faro",     query: "restaurante Faro",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Setubal",  query: "restaurante Setúbal",       searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Funchal",  query: "restaurante Funchal",       searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "advogado Lisboa",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "advogado Porto",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "advogado Braga",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "advogado Coimbra",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Faro",     query: "advogado Faro",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Funchal",  query: "advogado Funchal",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "oficina automóvel Lisboa",  searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "oficina automóvel Porto",   searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "oficina automóvel Braga",   searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "oficina automóvel Coimbra", searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Faro",     query: "oficina automóvel Faro",    searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "ginásio Lisboa",            searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "ginásio Porto",             searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "ginásio Braga",             searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "ginásio Coimbra",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Faro",     query: "ginásio Faro",              searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "veterinário Lisboa",        searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Portugal", city: "Porto",    query: "veterinário Porto",         searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Portugal", city: "Braga",    query: "veterinário Braga",         searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "veterinário Coimbra",       searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "arquiteto Lisboa",          searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "arquiteto Porto",           searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "arquiteto Braga",           searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "arquiteto Coimbra",         searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Portugal", city: "Lisbon",   query: "salão de beleza Lisboa",    searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Porto",    query: "salão de beleza Porto",     searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Braga",    query: "salão de beleza Braga",     searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Coimbra",  query: "salão de beleza Coimbra",   searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Portugal", city: "Faro",     query: "salão de beleza Faro",      searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── GREECE ─────────────────────────────────────────────────────────────────
  { country: "Greece", city: "Athens",       query: "restaurant Athens",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "hair salon Athens",          searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "physiotherapy Athens",       searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Greece", city: "Athens",       query: "dentist Athens",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Greece", city: "Athens",       query: "accountant Athens",          searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "restaurant Thessaloniki",    searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "hair salon Thessaloniki",    searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "physiotherapy Thessaloniki", searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "dentist Thessaloniki",       searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Greece", city: "Patras",       query: "restaurant Patras",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Patras",       query: "dentist Patras",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Greece", city: "Heraklion",    query: "restaurant Heraklion",       searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Heraklion",    query: "dentist Heraklion",          searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Greece", city: "Larissa",      query: "restaurant Larissa",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Volos",        query: "restaurant Volos",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Ioannina",     query: "restaurant Ioannina",        searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "law firm Athens",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "law firm Thessaloniki",      searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Patras",       query: "law firm Patras",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Heraklion",    query: "law firm Heraklion",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "auto repair Athens",         searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "auto repair Thessaloniki",   searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Greece", city: "Patras",       query: "auto repair Patras",         searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Greece", city: "Heraklion",    query: "auto repair Heraklion",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "gym fitness Athens",         searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "gym fitness Thessaloniki",   searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Greece", city: "Patras",       query: "gym fitness Patras",         searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Greece", city: "Heraklion",    query: "gym fitness Heraklion",      searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "veterinary clinic Athens",   searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "veterinary Thessaloniki",    searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Greece", city: "Patras",       query: "veterinary Patras",          searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Greece", city: "Athens",       query: "architecture firm Athens",   searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "architecture Thessaloniki",  searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Patras",       query: "architecture firm Patras",   searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Greece", city: "Athens",       query: "beauty salon Athens",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Greece", city: "Thessaloniki", query: "beauty salon Thessaloniki",  searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Greece", city: "Patras",       query: "beauty salon Patras",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Greece", city: "Heraklion",    query: "beauty salon Heraklion",     searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── CROATIA ────────────────────────────────────────────────────────────────
  { country: "Croatia", city: "Zagreb",  query: "restoran Zagreb",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "frizerski salon Zagreb",   searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "fizioterapeut Zagreb",     searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "zubar Zagreb",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "računovođa Zagreb",        searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "restoran Split",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "frizerski salon Split",    searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "fizioterapeut Split",      searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Croatia", city: "Split",   query: "zubar Split",              searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "restoran Rijeka",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "zubar Rijeka",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Croatia", city: "Osijek",  query: "restoran Osijek",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Zadar",   query: "restoran Zadar",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Pula",    query: "restoran Pula",            searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "odvjetnik Zagreb",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "odvjetnik Split",          searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "odvjetnik Rijeka",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Osijek",  query: "odvjetnik Osijek",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "autoservis Zagreb",        searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "autoservis Split",         searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "autoservis Rijeka",        searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Osijek",  query: "autoservis Osijek",        searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "teretana Zagreb",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "teretana Split",           searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "teretana Rijeka",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "veterinar Zagreb",         searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Croatia", city: "Split",   query: "veterinar Split",          searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "veterinar Rijeka",         searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "arhitektski ured Zagreb",  searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "arhitektski ured Split",   searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Croatia", city: "Zagreb",  query: "salon ljepote Zagreb",     searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Split",   query: "salon ljepote Split",      searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Croatia", city: "Rijeka",  query: "salon ljepote Rijeka",     searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 5 — EAST EUROPE
  // ══════════════════════════════════════════════════════════════════════════════

  // ── POLAND ─────────────────────────────────────────────────────────────────
  { country: "Poland", city: "Warsaw",  query: "restauracja Warszawa",             searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "fryzjer Warszawa",                 searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "fizjoterapeuta Warszawa",          searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "dentysta Warszawa",                searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "biuro rachunkowe Warszawa",        searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "restauracja Kraków",               searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "fryzjer Kraków",                   searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "fizjoterapeuta Kraków",            searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Poland", city: "Krakow",  query: "dentysta Kraków",                  searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "restauracja Wrocław",              searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "fizjoterapeuta Wrocław",           searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "restauracja Gdańsk",               searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "dentysta Gdańsk",                  searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Poland", city: "Poznan",  query: "restauracja Poznań",               searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Lodz",    query: "restauracja Łódź",                 searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Katowice",query: "restauracja Katowice",             searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "kancelaria prawna Warszawa",       searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "kancelaria prawna Kraków",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "kancelaria prawna Wrocław",        searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "kancelaria prawna Gdańsk",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Poznan",  query: "kancelaria prawna Poznań",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Lodz",    query: "kancelaria prawna Łódź",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "warsztat samochodowy Warszawa",    searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "warsztat samochodowy Kraków",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "warsztat samochodowy Wrocław",     searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "warsztat samochodowy Gdańsk",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Poland", city: "Poznan",  query: "warsztat samochodowy Poznań",      searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Poland", city: "Katowice",query: "warsztat samochodowy Katowice",    searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "siłownia Warszawa",                searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "siłownia Kraków",                  searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "siłownia Wrocław",                 searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "siłownia Gdańsk",                  searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Poland", city: "Poznan",  query: "siłownia Poznań",                  searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "weterynarz Warszawa",              searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Poland", city: "Krakow",  query: "weterynarz Kraków",                searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "weterynarz Wrocław",               searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "weterynarz Gdańsk",                searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "pracownia architektoniczna Warszawa", searchCategory: "Architecture Firm", niche: "architects",         domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "pracownia architektoniczna Kraków",  searchCategory: "Architecture Firm", niche: "architects",         domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "pracownia architektoniczna Wrocław", searchCategory: "Architecture Firm", niche: "architects",         domain: "b2b",    phase: 5 },
  { country: "Poland", city: "Warsaw",  query: "salon urody Warszawa",             searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Poland", city: "Krakow",  query: "salon urody Kraków",               searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Poland", city: "Wroclaw", query: "salon urody Wrocław",              searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Poland", city: "Gdansk",  query: "salon urody Gdańsk",               searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Poland", city: "Poznan",  query: "salon urody Poznań",               searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── ROMANIA ────────────────────────────────────────────────────────────────
  { country: "Romania", city: "Bucharest",   query: "restaurant București",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "frizerie București",           searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "fizioterapeut București",      searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "stomatolog București",         searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "contabil București",           searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "restaurant Cluj-Napoca",       searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "frizerie Cluj-Napoca",         searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "stomatolog Cluj-Napoca",       searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "restaurant Timișoara",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "stomatolog Timișoara",         searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Romania", city: "Iasi",        query: "restaurant Iași",              searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Constanta",   query: "restaurant Constanța",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Brasov",      query: "restaurant Brașov",            searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Craiova",     query: "restaurant Craiova",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "avocat București",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "avocat Cluj-Napoca",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "avocat Timișoara",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Iasi",        query: "avocat Iași",                  searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Brasov",      query: "avocat Brașov",                searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "service auto București",       searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "service auto Cluj-Napoca",     searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "service auto Timișoara",       searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Romania", city: "Iasi",        query: "service auto Iași",            searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Romania", city: "Brasov",      query: "service auto Brașov",          searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Romania", city: "Craiova",     query: "service auto Craiova",         searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "sala fitness București",       searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "sala fitness Cluj-Napoca",     searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "sala fitness Timișoara",       searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Romania", city: "Iasi",        query: "sala fitness Iași",            searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Romania", city: "Brasov",      query: "sala fitness Brașov",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "cabinet veterinar București",  searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "cabinet veterinar Cluj",       searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "cabinet veterinar Timișoara",  searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "birou arhitectura București",  searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "birou arhitectura Cluj",       searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "birou arhitectura Timișoara",  searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Romania", city: "Bucharest",   query: "salon frumusete București",    searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Romania", city: "Cluj-Napoca", query: "salon frumusete Cluj-Napoca",  searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Romania", city: "Timisoara",   query: "salon frumusete Timișoara",    searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Romania", city: "Iasi",        query: "salon frumusete Iași",         searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Romania", city: "Brasov",      query: "salon frumusete Brașov",       searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── CZECH REPUBLIC ─────────────────────────────────────────────────────────
  { country: "Czech Republic", city: "Prague",         query: "restaurace Praha",              searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "kadeřnictví Praha",             searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "fyzioterapeut Praha",           searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "zubař Praha",                   searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "účetní Praha",                  searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "restaurace Brno",               searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "kadeřnictví Brno",              searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "zubař Brno",                    searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "restaurace Ostrava",            searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "zubař Ostrava",                 searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Plzen",          query: "restaurace Plzeň",              searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Olomouc",        query: "restaurace Olomouc",            searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Liberec",        query: "restaurace Liberec",            searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "advokát Praha",                 searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "advokát Brno",                  searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "advokát Ostrava",               searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Plzen",          query: "advokát Plzeň",                 searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "autoservis Praha",              searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "autoservis Brno",               searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "autoservis Ostrava",            searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Plzen",          query: "autoservis Plzeň",              searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "fitness centrum Praha",         searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "fitness centrum Brno",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "fitness centrum Ostrava",       searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "veterinář Praha",               searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "veterinář Brno",                searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "veterinář Ostrava",             searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "architektonická kancelář Praha",searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "architektonická kancelář Brno", searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Czech Republic", city: "Prague",         query: "kosmetický salon Praha",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Brno",           query: "kosmetický salon Brno",         searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Ostrava",        query: "kosmetický salon Ostrava",      searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Czech Republic", city: "Plzen",          query: "kosmetický salon Plzeň",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── HUNGARY ────────────────────────────────────────────────────────────────
  { country: "Hungary", city: "Budapest",    query: "étterem Budapest",              searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "fodrász Budapest",              searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "fizioterapeuta Budapest",       searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "fogorvos Budapest",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "könyvelő Budapest",             searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "étterem Debrecen",              searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "fogorvos Debrecen",             searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Hungary", city: "Miskolc",     query: "étterem Miskolc",               searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Pecs",        query: "étterem Pécs",                  searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Gyor",        query: "étterem Győr",                  searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Szeged",      query: "étterem Szeged",                searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "ügyvédi iroda Budapest",        searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "ügyvédi iroda Debrecen",        searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Miskolc",     query: "ügyvédi iroda Miskolc",         searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Pecs",        query: "ügyvédi iroda Pécs",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Gyor",        query: "ügyvédi iroda Győr",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "autószerviz Budapest",          searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "autószerviz Debrecen",          searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Miskolc",     query: "autószerviz Miskolc",           searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Pecs",        query: "autószerviz Pécs",              searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Gyor",        query: "autószerviz Győr",              searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "fitnesz terem Budapest",        searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "fitnesz terem Debrecen",        searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Miskolc",     query: "fitnesz terem Miskolc",         searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Pecs",        query: "fitnesz terem Pécs",            searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "állatorvos Budapest",           searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "állatorvos Debrecen",           searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Hungary", city: "Miskolc",     query: "állatorvos Miskolc",            searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "építészeti iroda Budapest",     searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "építészeti iroda Debrecen",     searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Hungary", city: "Budapest",    query: "szépségszalon Budapest",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Debrecen",    query: "szépségszalon Debrecen",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Miskolc",     query: "szépségszalon Miskolc",         searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Pecs",        query: "szépségszalon Pécs",            searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Hungary", city: "Gyor",        query: "szépségszalon Győr",            searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ── BULGARIA ───────────────────────────────────────────────────────────────
  { country: "Bulgaria", city: "Sofia",        query: "restaurant Sofia",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "hair salon Sofia",           searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "physiotherapy Sofia",        searchCategory: "Physiotherapy",     niche: "health",                domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "dentist Sofia",              searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "accountant Sofia",           searchCategory: "Accountant",        niche: "professional_services", domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "restaurant Plovdiv",         searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "hair salon Plovdiv",         searchCategory: "Hair Salon",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "dentist Plovdiv",            searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "restaurant Varna",           searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "dentist Varna",              searchCategory: "Dental Clinic",     niche: "health",                domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Burgas",       query: "restaurant Burgas",          searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Stara Zagora", query: "restaurant Stara Zagora",    searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Ruse",         query: "restaurant Ruse",            searchCategory: "Restaurant",        niche: "restaurants",           domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "law firm Sofia",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "law firm Plovdiv",           searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "law firm Varna",             searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Burgas",       query: "law firm Burgas",            searchCategory: "Law Firm",          niche: "law_firms",             domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "auto repair Sofia",          searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "auto repair Plovdiv",        searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "auto repair Varna",          searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Burgas",       query: "auto repair Burgas",         searchCategory: "Auto Workshop",     niche: "auto_workshops",        domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "gym fitness Sofia",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "gym fitness Plovdiv",        searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "gym fitness Varna",          searchCategory: "Gym",               niche: "fitness",               domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "veterinary clinic Sofia",    searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "veterinary Plovdiv",         searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "veterinary Varna",           searchCategory: "Veterinary Clinic", niche: "veterinary",            domain: "health", phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "architecture firm Sofia",    searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "architecture firm Plovdiv",  searchCategory: "Architecture Firm", niche: "architects",            domain: "b2b",    phase: 5 },
  { country: "Bulgaria", city: "Sofia",        query: "beauty salon Sofia",         searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Plovdiv",      query: "beauty salon Plovdiv",       searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Varna",        query: "beauty salon Varna",         searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },
  { country: "Bulgaria", city: "Burgas",       query: "beauty salon Burgas",        searchCategory: "Beauty Salon",      niche: "beauty",                domain: "crm",    phase: 5 },

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — EDUCATION
  // 3 niches × all 25 countries ≈ 200 leads/country
  //   government_universities : public/state universities  (domain: b2b)
  //   private_universities    : private unis + high schools (domain: b2b)
  //   learning_centers        : courses, formation, certification (domain: crm)
  // ══════════════════════════════════════════════════════════════════════════

  // ── AUSTRIA ────────────────────────────────────────────────────────────
  { country: "Austria", city: "Vienna",  query: "Universität Wien",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Austria", city: "Vienna",  query: "Hochschule Wien",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Austria", city: "Graz",    query: "Universität Graz",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Austria", city: "Vienna",  query: "private Universität Wien",      searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Austria", city: "Vienna",  query: "private Hochschule Wien",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Austria", city: "Vienna",  query: "Weiterbildungszentrum Wien",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Austria", city: "Vienna",  query: "Sprachschule Wien",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── GERMANY ────────────────────────────────────────────────────────────
  { country: "Germany", city: "Berlin",    query: "Universität Berlin",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Germany", city: "Munich",    query: "Universität München",           searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Germany", city: "Hamburg",   query: "Universität Hamburg",           searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Germany", city: "Frankfurt", query: "Hochschule Frankfurt",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Germany", city: "Berlin",    query: "private Hochschule Berlin",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Germany", city: "Munich",    query: "private Universität München",   searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Germany", city: "Berlin",    query: "Weiterbildung Kurs Berlin",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Germany", city: "Munich",    query: "Sprachschule München",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Germany", city: "Hamburg",   query: "Sprachschule Hamburg",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── BELGIUM ────────────────────────────────────────────────────────────
  { country: "Belgium", city: "Brussels",  query: "université Bruxelles",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Brussels",  query: "universiteit Brussel",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Ghent",     query: "universiteit Gent",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Brussels",  query: "private university Brussels",   searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Brussels",  query: "centre de formation Bruxelles", searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Belgium", city: "Brussels",  query: "language school Brussels",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── NETHERLANDS ────────────────────────────────────────────────────────
  { country: "Netherlands", city: "Amsterdam", query: "universiteit Amsterdam",        searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Rotterdam", query: "universiteit Rotterdam",        searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Utrecht",   query: "universiteit Utrecht",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Amsterdam", query: "private university Amsterdam",  searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Amsterdam", query: "language school Amsterdam",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Netherlands", city: "Rotterdam", query: "training center Rotterdam",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── SWITZERLAND ────────────────────────────────────────────────────────
  { country: "Switzerland", city: "Zurich",  query: "Universität Zürich",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Switzerland", city: "Geneva",  query: "université Genève",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Switzerland", city: "Basel",   query: "Universität Basel",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Switzerland", city: "Zurich",  query: "private Hochschule Zürich",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Switzerland", city: "Zurich",  query: "Sprachschule Zürich",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Switzerland", city: "Geneva",  query: "centre de formation Genève",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── SWEDEN ─────────────────────────────────────────────────────────────
  { country: "Sweden", city: "Stockholm",  query: "universitet Stockholm",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Sweden", city: "Gothenburg", query: "universitet Göteborg",           searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Sweden", city: "Stockholm",  query: "private university Stockholm",   searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Sweden", city: "Stockholm",  query: "language school Stockholm",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Sweden", city: "Stockholm",  query: "professional training Stockholm",searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── NORWAY ─────────────────────────────────────────────────────────────
  { country: "Norway", city: "Oslo",    query: "universitet Oslo",                searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Norway", city: "Bergen",  query: "universitet Bergen",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Norway", city: "Oslo",    query: "private university Oslo",         searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Norway", city: "Oslo",    query: "language school Oslo",            searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Norway", city: "Oslo",    query: "kurs senter Oslo",                searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── DENMARK ────────────────────────────────────────────────────────────
  { country: "Denmark", city: "Copenhagen", query: "universitet København",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Denmark", city: "Aarhus",     query: "universitet Aarhus",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Denmark", city: "Copenhagen", query: "private university Copenhagen", searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Denmark", city: "Copenhagen", query: "language school Copenhagen",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Denmark", city: "Copenhagen", query: "kursuscenter Copenhagen",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── UAE ────────────────────────────────────────────────────────────────
  { country: "UAE", city: "Dubai",     query: "university Dubai",                searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "UAE", city: "Abu Dhabi", query: "university Abu Dhabi",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "UAE", city: "Dubai",     query: "private university Dubai",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "UAE", city: "Abu Dhabi", query: "private college Abu Dhabi",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "UAE", city: "Dubai",     query: "training center Dubai",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "UAE", city: "Dubai",     query: "language school Dubai",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "UAE", city: "Abu Dhabi", query: "professional courses Abu Dhabi",  searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── USA ────────────────────────────────────────────────────────────────
  { country: "USA", city: "New York",    query: "university New York",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "USA", city: "Los Angeles", query: "university Los Angeles",          searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "USA", city: "Chicago",     query: "university Chicago",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "USA", city: "New York",    query: "private college New York",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "USA", city: "Los Angeles", query: "private college Los Angeles",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "USA", city: "New York",    query: "professional training New York",  searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "USA", city: "Los Angeles", query: "language school Los Angeles",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "USA", city: "Chicago",     query: "certification courses Chicago",   searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── IRELAND ────────────────────────────────────────────────────────────
  { country: "Ireland", city: "Dublin", query: "university Dublin",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Ireland", city: "Cork",   query: "university Cork",                 searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Ireland", city: "Dublin", query: "private college Dublin",          searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Ireland", city: "Dublin", query: "language school Dublin",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Ireland", city: "Dublin", query: "professional training Dublin",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ESTONIA ────────────────────────────────────────────────────────────
  { country: "Estonia", city: "Tallinn", query: "ülikool Tallinn",                searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Estonia", city: "Tartu",   query: "ülikool Tartu",                  searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Estonia", city: "Tallinn", query: "private university Tallinn",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Estonia", city: "Tallinn", query: "language school Tallinn",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Estonia", city: "Tallinn", query: "koolituskeskus Tallinn",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ICELAND ────────────────────────────────────────────────────────────
  { country: "Iceland", city: "Reykjavik", query: "háskóli Reykjavík",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Iceland", city: "Reykjavik", query: "university Reykjavik",         searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Iceland", city: "Reykjavik", query: "private university Reykjavik", searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Iceland", city: "Reykjavik", query: "language school Reykjavik",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── LUXEMBOURG ─────────────────────────────────────────────────────────
  { country: "Luxembourg", city: "Luxembourg City", query: "université Luxembourg",         searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "university Luxembourg",         searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "private college Luxembourg",    searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "centre de formation Luxembourg",searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "language school Luxembourg",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── LIECHTENSTEIN ──────────────────────────────────────────────────────
  { country: "Liechtenstein", city: "Vaduz", query: "Universität Liechtenstein",   searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Liechtenstein", city: "Vaduz", query: "private Hochschule Vaduz",    searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Liechtenstein", city: "Vaduz", query: "Sprachschule Vaduz",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ITALY ──────────────────────────────────────────────────────────────
  { country: "Italy", city: "Rome",    query: "università Roma",                  searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Italy", city: "Milan",   query: "università Milano",                searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Italy", city: "Naples",  query: "università Napoli",                searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Italy", city: "Rome",    query: "università privata Roma",          searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Italy", city: "Milan",   query: "università privata Milano",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Italy", city: "Rome",    query: "centro formazione Roma",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Italy", city: "Milan",   query: "scuola di lingua Milano",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Italy", city: "Naples",  query: "corso professionale Napoli",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── SPAIN ──────────────────────────────────────────────────────────────
  { country: "Spain", city: "Madrid",    query: "universidad Madrid",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Spain", city: "Barcelona", query: "universidad Barcelona",           searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Spain", city: "Valencia",  query: "universidad Valencia",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Spain", city: "Madrid",    query: "universidad privada Madrid",      searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Spain", city: "Barcelona", query: "universidad privada Barcelona",   searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Spain", city: "Madrid",    query: "centro de formación Madrid",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Spain", city: "Barcelona", query: "academia idiomas Barcelona",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Spain", city: "Valencia",  query: "academia formación Valencia",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── PORTUGAL ───────────────────────────────────────────────────────────
  { country: "Portugal", city: "Lisbon", query: "universidade Lisboa",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Portugal", city: "Porto",  query: "universidade Porto",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Portugal", city: "Lisbon", query: "universidade privada Lisboa",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Portugal", city: "Lisbon", query: "centro de formação Lisboa",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Portugal", city: "Porto",  query: "escola de línguas Porto",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── POLAND ─────────────────────────────────────────────────────────────
  { country: "Poland", city: "Warsaw",  query: "uniwersytet Warszawa",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Poland", city: "Krakow",  query: "uniwersytet Kraków",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Poland", city: "Wroclaw", query: "uniwersytet Wrocław",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Poland", city: "Warsaw",  query: "uczelnia prywatna Warszawa",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Poland", city: "Warsaw",  query: "centrum szkoleniowe Warszawa",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Poland", city: "Krakow",  query: "szkoła językowa Kraków",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ROMANIA ────────────────────────────────────────────────────────────
  { country: "Romania", city: "Bucharest", query: "universitate Bucuresti",         searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Romania", city: "Cluj",      query: "universitate Cluj",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Romania", city: "Bucharest", query: "universitate privata Bucuresti", searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Romania", city: "Bucharest", query: "centru de formare Bucuresti",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Romania", city: "Cluj",      query: "scoala de limbi Cluj",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── CROATIA ────────────────────────────────────────────────────────────
  { country: "Croatia", city: "Zagreb", query: "sveučilište Zagreb",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Croatia", city: "Split",  query: "sveučilište Split",                searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Croatia", city: "Zagreb", query: "privatno sveučilište Zagreb",      searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Croatia", city: "Zagreb", query: "centar za obrazovanje Zagreb",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Croatia", city: "Zagreb", query: "jezična škola Zagreb",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── GREECE ─────────────────────────────────────────────────────────────
  { country: "Greece", city: "Athens",       query: "university Athens",            searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Greece", city: "Thessaloniki", query: "university Thessaloniki",      searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Greece", city: "Athens",       query: "private university Athens",    searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Greece", city: "Athens",       query: "language school Athens",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Greece", city: "Athens",       query: "professional training Athens", searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── BULGARIA ───────────────────────────────────────────────────────────
  { country: "Bulgaria", city: "Sofia",   query: "university Sofia",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Bulgaria", city: "Plovdiv", query: "university Plovdiv",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Bulgaria", city: "Sofia",   query: "private university Sofia",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Bulgaria", city: "Sofia",   query: "language school Sofia",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Bulgaria", city: "Sofia",   query: "training center Sofia",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── CZECH REPUBLIC ─────────────────────────────────────────────────────
  { country: "Czech Republic", city: "Prague", query: "univerzita Praha",                  searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Czech Republic", city: "Brno",   query: "univerzita Brno",                   searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Czech Republic", city: "Prague", query: "soukromá vysoká škola Praha",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Czech Republic", city: "Prague", query: "jazyková škola Praha",              searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Czech Republic", city: "Prague", query: "vzdělávací centrum Praha",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── HUNGARY ────────────────────────────────────────────────────────────
  { country: "Hungary", city: "Budapest", query: "egyetem Budapest",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Hungary", city: "Debrecen", query: "egyetem Debrecen",               searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Hungary", city: "Budapest", query: "magánegyetem Budapest",          searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Hungary", city: "Budapest", query: "nyelviskolák Budapest",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Hungary", city: "Budapest", query: "képzési központ Budapest",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 6 — TOP-UP: extra private_universities + learning_centers per country
  // Goal: reach ~200 total per country despite sparse gov_university listings
  // ══════════════════════════════════════════════════════════════════════════

  // ── AUSTRIA top-up ─────────────────────────────────────────────────────
  { country: "Austria", city: "Graz",    query: "Fachhochschule Graz",            searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Austria", city: "Linz",    query: "Privatuniversität Linz",         searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Austria", city: "Vienna",  query: "Volkshochschule Wien",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Austria", city: "Graz",    query: "Sprachschule Graz",              searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Austria", city: "Linz",    query: "Weiterbildung Linz",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── GERMANY top-up ─────────────────────────────────────────────────────
  { country: "Germany", city: "Cologne",  query: "private Hochschule Köln",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Germany", city: "Dusseldorf", query: "private Hochschule Düsseldorf",searchCategory: "Private University",   niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Germany", city: "Berlin",   query: "Volkshochschule Berlin",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Germany", city: "Cologne",  query: "Sprachschule Köln",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Germany", city: "Frankfurt",query: "Weiterbildungszentrum Frankfurt",searchCategory: "Learning Center",      niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── BELGIUM top-up ─────────────────────────────────────────────────────
  { country: "Belgium", city: "Antwerp",  query: "universiteit Antwerpen",        searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Liege",    query: "université Liège",              searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Antwerp",  query: "private university Antwerp",    searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Ghent",    query: "private university Ghent",      searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Liege",    query: "haute école Liège",             searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Belgium", city: "Brussels", query: "taalschool Brussel",            searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Belgium", city: "Antwerp",  query: "language school Antwerp",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Belgium", city: "Ghent",    query: "taalschool Gent",               searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Belgium", city: "Liege",    query: "centre de formation Liège",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── NETHERLANDS top-up ─────────────────────────────────────────────────
  { country: "Netherlands", city: "Amsterdam", query: "hogeschool Amsterdam",         searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Rotterdam", query: "hogeschool Rotterdam",         searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Utrecht",   query: "hogeschool Utrecht",           searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Den Haag",  query: "private university Den Haag",  searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Amsterdam", query: "private college Amsterdam",    searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Netherlands", city: "Rotterdam", query: "taalschool Rotterdam",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Netherlands", city: "Amsterdam", query: "taalschool Amsterdam",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Netherlands", city: "Utrecht",   query: "language school Utrecht",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Netherlands", city: "Den Haag",  query: "professional training Den Haag",searchCategory: "Learning Center",     niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── SWITZERLAND top-up ─────────────────────────────────────────────────
  { country: "Switzerland", city: "Bern",    query: "Fachhochschule Bern",           searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Switzerland", city: "Geneva",  query: "private university Geneva",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Switzerland", city: "Zurich",  query: "Volkshochschule Zürich",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Switzerland", city: "Bern",    query: "Sprachschule Bern",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Switzerland", city: "Lausanne",query: "formation professionnelle Lausanne",searchCategory: "Learning Center",   niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── SWEDEN top-up ──────────────────────────────────────────────────────
  { country: "Sweden", city: "Gothenburg", query: "private university Gothenburg",  searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Sweden", city: "Malmo",      query: "private college Malmö",          searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Sweden", city: "Stockholm",  query: "utbildningscenter Stockholm",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Sweden", city: "Gothenburg", query: "language school Gothenburg",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Sweden", city: "Malmo",      query: "sprachschule Malmö",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── NORWAY top-up ──────────────────────────────────────────────────────
  { country: "Norway", city: "Trondheim", query: "private university Trondheim",   searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Norway", city: "Bergen",    query: "private college Bergen",         searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Norway", city: "Bergen",    query: "language school Bergen",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Norway", city: "Oslo",      query: "opplæringssenter Oslo",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Norway", city: "Trondheim", query: "professional training Trondheim",searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── DENMARK top-up ─────────────────────────────────────────────────────
  { country: "Denmark", city: "Aarhus",     query: "private college Aarhus",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Denmark", city: "Odense",     query: "private university Odense",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Denmark", city: "Copenhagen", query: "sprogskole København",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Denmark", city: "Aarhus",     query: "language school Aarhus",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Denmark", city: "Odense",     query: "professional training Odense",  searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── UAE top-up ─────────────────────────────────────────────────────────
  { country: "UAE", city: "Dubai",     query: "private college Dubai",          searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "UAE", city: "Sharjah",   query: "university Sharjah",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "UAE", city: "Dubai",     query: "IT training center Dubai",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "UAE", city: "Dubai",     query: "certification courses Dubai",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "UAE", city: "Abu Dhabi", query: "language school Abu Dhabi",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── USA top-up ─────────────────────────────────────────────────────────
  { country: "USA", city: "Chicago",     query: "private college Chicago",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "USA", city: "Houston",     query: "university Houston",             searchCategory: "Government University", niche: "government_universities", domain: "b2b", phase: 6 },
  { country: "USA", city: "New York",    query: "language school New York",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "USA", city: "Los Angeles", query: "professional training Los Angeles",searchCategory: "Learning Center",     niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "USA", city: "Chicago",     query: "IT training center Chicago",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── IRELAND top-up ─────────────────────────────────────────────────────
  { country: "Ireland", city: "Dublin", query: "IT college Dublin",              searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Ireland", city: "Cork",   query: "private college Cork",           searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Ireland", city: "Dublin", query: "language school Dublin",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Ireland", city: "Cork",   query: "professional training Cork",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Ireland", city: "Galway", query: "language school Galway",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ESTONIA top-up ─────────────────────────────────────────────────────
  { country: "Estonia", city: "Tartu",   query: "private university Tartu",      searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Estonia", city: "Tallinn", query: "college Tallinn",               searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Estonia", city: "Tartu",   query: "language school Tartu",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Estonia", city: "Tallinn", query: "IT koolitus Tallinn",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Estonia", city: "Tallinn", query: "professional training Tallinn", searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ICELAND top-up ─────────────────────────────────────────────────────
  { country: "Iceland", city: "Reykjavik", query: "college Reykjavik",           searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Iceland", city: "Reykjavik", query: "professional training Reykjavik",searchCategory: "Learning Center",   niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Iceland", city: "Reykjavik", query: "IT courses Reykjavik",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Iceland", city: "Reykjavik", query: "language school Iceland",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── LUXEMBOURG top-up ──────────────────────────────────────────────────
  { country: "Luxembourg", city: "Luxembourg City", query: "private college Luxembourg City",  searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "Sprachschule Luxembourg",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "IT training Luxembourg",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Luxembourg", city: "Luxembourg City", query: "professional courses Luxembourg", searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── LIECHTENSTEIN top-up ───────────────────────────────────────────────
  { country: "Liechtenstein", city: "Vaduz", query: "language school Liechtenstein",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Liechtenstein", city: "Vaduz", query: "Weiterbildung Liechtenstein",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Liechtenstein", city: "Vaduz", query: "professional training Vaduz",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ITALY top-up ───────────────────────────────────────────────────────
  { country: "Italy", city: "Rome",     query: "college privato Roma",            searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Italy", city: "Milan",    query: "istituto privato Milano",         searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Italy", city: "Rome",     query: "centro lingue Roma",              searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Italy", city: "Milan",    query: "formazione professionale Milano", searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Italy", city: "Florence", query: "scuola di lingua Firenze",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── SPAIN top-up ───────────────────────────────────────────────────────
  { country: "Spain", city: "Seville",   query: "universidad privada Sevilla",    searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Spain", city: "Bilbao",    query: "universidad privada Bilbao",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Spain", city: "Madrid",    query: "escuela de idiomas Madrid",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Spain", city: "Barcelona", query: "formación profesional Barcelona",searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Spain", city: "Seville",   query: "academia formación Sevilla",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── PORTUGAL top-up ────────────────────────────────────────────────────
  { country: "Portugal", city: "Porto",  query: "college privado Porto",          searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Portugal", city: "Lisbon", query: "escola superior Lisboa",         searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Portugal", city: "Porto",  query: "centro formação Porto",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Portugal", city: "Lisbon", query: "escola idiomas Lisboa",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Portugal", city: "Braga",  query: "language school Braga",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── POLAND top-up ──────────────────────────────────────────────────────
  { country: "Poland", city: "Gdansk",  query: "prywatna uczelnia Gdańsk",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Poland", city: "Poznan",  query: "uczelnia prywatna Poznań",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Poland", city: "Krakow",  query: "centrum szkoleniowe Kraków",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Poland", city: "Warsaw",  query: "szkoła językowa Warszawa",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Poland", city: "Wroclaw", query: "language school Wrocław",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── ROMANIA top-up ─────────────────────────────────────────────────────
  { country: "Romania", city: "Cluj",       query: "universitate privata Cluj",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Romania", city: "Timisoara",  query: "college Timișoara",             searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Romania", city: "Bucharest",  query: "centru formare Bucuresti",      searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Romania", city: "Cluj",       query: "scoala de limbi Cluj",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Romania", city: "Timisoara",  query: "language school Timișoara",     searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── CROATIA top-up ─────────────────────────────────────────────────────
  { country: "Croatia", city: "Rijeka",  query: "visoka škola Rijeka",             searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Croatia", city: "Osijek",  query: "privatno sveučilište Osijek",     searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Croatia", city: "Split",   query: "jezična škola Split",             searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Croatia", city: "Zagreb",  query: "centar za učenje Zagreb",         searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Croatia", city: "Rijeka",  query: "language school Rijeka",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── GREECE top-up ──────────────────────────────────────────────────────
  { country: "Greece", city: "Thessaloniki", query: "private college Thessaloniki", searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Greece", city: "Athens",       query: "private school Athens",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Greece", city: "Thessaloniki", query: "language school Thessaloniki", searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Greece", city: "Athens",       query: "training center Athens",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Greece", city: "Patras",       query: "language school Patras",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── BULGARIA top-up ────────────────────────────────────────────────────
  { country: "Bulgaria", city: "Varna",   query: "private university Varna",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Bulgaria", city: "Plovdiv", query: "college Plovdiv",                searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Bulgaria", city: "Plovdiv", query: "language school Plovdiv",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Bulgaria", city: "Sofia",   query: "IT training center Sofia",       searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Bulgaria", city: "Varna",   query: "professional training Varna",    searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── CZECH REPUBLIC top-up ──────────────────────────────────────────────
  { country: "Czech Republic", city: "Ostrava", query: "soukromá škola Ostrava",       searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Czech Republic", city: "Plzen",   query: "private college Plzeň",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Czech Republic", city: "Brno",    query: "jazyková škola Brno",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Czech Republic", city: "Ostrava", query: "vzdělávací centrum Ostrava",   searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Czech Republic", city: "Prague",  query: "IT kurzy Praha",               searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ── HUNGARY top-up ─────────────────────────────────────────────────────
  { country: "Hungary", city: "Miskolc",  query: "magániskola Miskolc",            searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Hungary", city: "Pecs",     query: "private university Pécs",        searchCategory: "Private University",    niche: "private_universities",    domain: "b2b", phase: 6 },
  { country: "Hungary", city: "Debrecen", query: "nyelviskolák Debrecen",          searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Hungary", city: "Miskolc",  query: "képzési központ Miskolc",        searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },
  { country: "Hungary", city: "Gyor",     query: "language school Győr",           searchCategory: "Learning Center",       niche: "learning_centers",        domain: "crm", phase: 6 },

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — USA  (80 queries × ~20 results = ~1600 raw leads)
  // Focus: dental, auto repair, law, gym, beauty, physio — high website+phone rate
  // 20 cities across 20 different states
  // ══════════════════════════════════════════════════════════════════════════

  // ── New York, NY ──────────────────────────────────────────────────────────
  { country: "USA", state: "NY", city: "New York",      query: "dental clinic New York",         searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "NY", city: "New York",      query: "auto repair shop New York",      searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "NY", city: "New York",      query: "law firm New York",              searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "NY", city: "New York",      query: "physical therapy New York",      searchCategory: "Physiotherapy",   niche: "health",         domain: "health", phase: 3 },

  // ── Los Angeles, CA ───────────────────────────────────────────────────────
  { country: "USA", state: "CA", city: "Los Angeles",   query: "dental clinic Los Angeles",      searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "CA", city: "Los Angeles",   query: "auto repair shop Los Angeles",   searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "CA", city: "Los Angeles",   query: "beauty salon Los Angeles",       searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },
  { country: "USA", state: "CA", city: "Los Angeles",   query: "gym fitness Los Angeles",        searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Houston, TX ───────────────────────────────────────────────────────────
  { country: "USA", state: "TX", city: "Houston",       query: "dental clinic Houston",          searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "TX", city: "Houston",       query: "auto repair shop Houston",       searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "TX", city: "Houston",       query: "law firm Houston",               searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "TX", city: "Houston",       query: "beauty salon Houston",           searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },

  // ── Miami, FL ─────────────────────────────────────────────────────────────
  { country: "USA", state: "FL", city: "Miami",         query: "dental clinic Miami",            searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "FL", city: "Miami",         query: "auto repair shop Miami",         searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "FL", city: "Miami",         query: "law firm Miami",                 searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "FL", city: "Miami",         query: "gym fitness Miami",              searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Chicago, IL ───────────────────────────────────────────────────────────
  { country: "USA", state: "IL", city: "Chicago",       query: "dental clinic Chicago",          searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "IL", city: "Chicago",       query: "auto repair shop Chicago",       searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "IL", city: "Chicago",       query: "law firm Chicago",               searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "IL", city: "Chicago",       query: "physical therapy Chicago",       searchCategory: "Physiotherapy",   niche: "health",         domain: "health", phase: 3 },

  // ── Phoenix, AZ ───────────────────────────────────────────────────────────
  { country: "USA", state: "AZ", city: "Phoenix",       query: "dental clinic Phoenix",          searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "AZ", city: "Phoenix",       query: "auto repair shop Phoenix",       searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "AZ", city: "Phoenix",       query: "beauty salon Phoenix",           searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },
  { country: "USA", state: "AZ", city: "Phoenix",       query: "gym fitness Phoenix",            searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Philadelphia, PA ──────────────────────────────────────────────────────
  { country: "USA", state: "PA", city: "Philadelphia",  query: "dental clinic Philadelphia",     searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "PA", city: "Philadelphia",  query: "auto repair shop Philadelphia",  searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "PA", city: "Philadelphia",  query: "law firm Philadelphia",          searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "PA", city: "Philadelphia",  query: "physical therapy Philadelphia",  searchCategory: "Physiotherapy",   niche: "health",         domain: "health", phase: 3 },

  // ── Seattle, WA ───────────────────────────────────────────────────────────
  { country: "USA", state: "WA", city: "Seattle",       query: "dental clinic Seattle",          searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "WA", city: "Seattle",       query: "auto repair shop Seattle",       searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "WA", city: "Seattle",       query: "law firm Seattle",               searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "WA", city: "Seattle",       query: "gym fitness Seattle",            searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Denver, CO ────────────────────────────────────────────────────────────
  { country: "USA", state: "CO", city: "Denver",        query: "dental clinic Denver",           searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "CO", city: "Denver",        query: "auto repair shop Denver",        searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "CO", city: "Denver",        query: "law firm Denver",                searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "CO", city: "Denver",        query: "beauty salon Denver",            searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },

  // ── Atlanta, GA ───────────────────────────────────────────────────────────
  { country: "USA", state: "GA", city: "Atlanta",       query: "dental clinic Atlanta",          searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "GA", city: "Atlanta",       query: "auto repair shop Atlanta",       searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "GA", city: "Atlanta",       query: "law firm Atlanta",               searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "GA", city: "Atlanta",       query: "beauty salon Atlanta",           searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },

  // ── Nashville, TN ─────────────────────────────────────────────────────────
  { country: "USA", state: "TN", city: "Nashville",     query: "dental clinic Nashville",        searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "TN", city: "Nashville",     query: "auto repair shop Nashville",     searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "TN", city: "Nashville",     query: "law firm Nashville",             searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "TN", city: "Nashville",     query: "beauty salon Nashville",         searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },

  // ── Portland, OR ──────────────────────────────────────────────────────────
  { country: "USA", state: "OR", city: "Portland",      query: "dental clinic Portland",         searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "OR", city: "Portland",      query: "auto repair shop Portland",      searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "OR", city: "Portland",      query: "law firm Portland",              searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "OR", city: "Portland",      query: "physical therapy Portland",      searchCategory: "Physiotherapy",   niche: "health",         domain: "health", phase: 3 },

  // ── Las Vegas, NV ─────────────────────────────────────────────────────────
  { country: "USA", state: "NV", city: "Las Vegas",     query: "dental clinic Las Vegas",        searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "NV", city: "Las Vegas",     query: "auto repair shop Las Vegas",     searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "NV", city: "Las Vegas",     query: "beauty salon Las Vegas",         searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },
  { country: "USA", state: "NV", city: "Las Vegas",     query: "gym fitness Las Vegas",          searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Boston, MA ────────────────────────────────────────────────────────────
  { country: "USA", state: "MA", city: "Boston",        query: "dental clinic Boston",           searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "MA", city: "Boston",        query: "law firm Boston",                searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "MA", city: "Boston",        query: "physical therapy Boston",        searchCategory: "Physiotherapy",   niche: "health",         domain: "health", phase: 3 },
  { country: "USA", state: "MA", city: "Boston",        query: "gym fitness Boston",             searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Charlotte, NC ─────────────────────────────────────────────────────────
  { country: "USA", state: "NC", city: "Charlotte",     query: "dental clinic Charlotte",        searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "NC", city: "Charlotte",     query: "auto repair shop Charlotte",     searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "NC", city: "Charlotte",     query: "beauty salon Charlotte",         searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },
  { country: "USA", state: "NC", city: "Charlotte",     query: "law firm Charlotte",             searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },

  // ── Detroit, MI ───────────────────────────────────────────────────────────
  { country: "USA", state: "MI", city: "Detroit",       query: "dental clinic Detroit",          searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "MI", city: "Detroit",       query: "auto repair shop Detroit",       searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "MI", city: "Detroit",       query: "law firm Detroit",               searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "MI", city: "Detroit",       query: "gym fitness Detroit",            searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },

  // ── Minneapolis, MN ───────────────────────────────────────────────────────
  { country: "USA", state: "MN", city: "Minneapolis",   query: "dental clinic Minneapolis",      searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "MN", city: "Minneapolis",   query: "auto repair shop Minneapolis",   searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "MN", city: "Minneapolis",   query: "law firm Minneapolis",           searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "MN", city: "Minneapolis",   query: "physical therapy Minneapolis",   searchCategory: "Physiotherapy",   niche: "health",         domain: "health", phase: 3 },

  // ── Columbus, OH ──────────────────────────────────────────────────────────
  { country: "USA", state: "OH", city: "Columbus",      query: "dental clinic Columbus Ohio",    searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "OH", city: "Columbus",      query: "auto repair shop Columbus Ohio", searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "OH", city: "Columbus",      query: "law firm Columbus Ohio",         searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "OH", city: "Columbus",      query: "beauty salon Columbus Ohio",     searchCategory: "Beauty Salon",    niche: "beauty",         domain: "crm",    phase: 3 },

  // ── Richmond, VA ──────────────────────────────────────────────────────────
  { country: "USA", state: "VA", city: "Richmond",      query: "dental clinic Richmond Virginia",searchCategory: "Dental Clinic",   niche: "dental",         domain: "health", phase: 3 },
  { country: "USA", state: "VA", city: "Richmond",      query: "auto repair shop Richmond VA",   searchCategory: "Auto Repair",     niche: "auto_workshops", domain: "crm",    phase: 3 },
  { country: "USA", state: "VA", city: "Richmond",      query: "law firm Richmond Virginia",     searchCategory: "Law Firm",        niche: "law_firms",      domain: "b2b",    phase: 3 },
  { country: "USA", state: "VA", city: "Richmond",      query: "gym fitness Richmond Virginia",  searchCategory: "Gym",             niche: "fitness",        domain: "crm",    phase: 3 },
];

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_HEADER = "name,category,search_category,address,phone,whatsapp,website,rating,review_count,city,state,country,maps_url,scraped_at\n";

function escCsv(v: string | null): string {
  if (!v) return "";
  const s = v.replace(/"/g, '""');
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
}

function toRow(r: Record<string, string | null>): string {
  return [
    r.name, r.category, r.search_category, r.address,
    r.phone, r.whatsapp, r.website, r.rating, r.review_count,
    r.city, r.state, r.country, r.maps_url, r.scraped_at,
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
  const filterNiche   = args.includes("--niche")   ? args[args.indexOf("--niche") + 1]   : null;
  const limitArg      = args.includes("--limit")   ? parseInt(args[args.indexOf("--limit") + 1]) : RESULTS_PER_SEARCH;
  const phaseArg      = args.includes("--phase")   ? parseInt(args[args.indexOf("--phase") + 1]) : null;

  const OUTPUT_DIR = join(__dirname, `../../scraper/phase${phaseArg ?? 4}`);

  let targets = filterCountry
    ? TARGETS.filter(t => t.country.toLowerCase() === filterCountry.toLowerCase())
    : TARGETS;
  if (phaseArg)       targets = targets.filter(t => (t.phase ?? 4) === phaseArg);
  if (filterNiche)    targets = targets.filter(t => t.niche.toLowerCase() === filterNiche.toLowerCase());

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
      for (let s = 0; s < 5; s++) {
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

          // Wait for URL to navigate to the place page (navigation may lag behind the click)
          if (!page.url().includes('/place/')) {
            await page.waitForURL('**/place/**', { timeout: 3000 }).catch(() => {});
          }

          // Extract name from URL (more reliable than h1 which returns the search results heading)
          const currentUrl = page.url();
          let name: string | null = null;
          if (currentUrl.includes('/place/')) {
            const raw = currentUrl.split('/place/')[1]?.split('/@')[0];
            if (raw) {
              try { name = decodeURIComponent(raw.replace(/\+/g, ' ')).trim(); }
              catch { name = null; }
            }
          }
          if (!name) name = await page.locator('h1').first().textContent().catch(() => null);
          if (!name?.trim()) continue;

          const category = await page.locator('button[jsaction*="category"]').first().textContent().catch(() => null);
          const address  = await page.locator('[data-item-id="address"] .fontBodyMedium').first().textContent().catch(() => null);
          const phone    = await page.locator('[data-item-id*="phone"] .fontBodyMedium').first().textContent().catch(() => null);
          const website  = await page.locator('a[data-item-id*="authority"]').first().getAttribute("href").catch(() => null);
          const rating   = await page.locator('.fontDisplayLarge').first().textContent().catch(() => null);
          const reviews  = await page.locator('[aria-label*="reviews"]').first().getAttribute("aria-label").catch(() => null);
          const mapsUrl  = page.url().includes("/place/") ? page.url().split("?")[0] : null;

          // Detect WhatsApp link on GMaps listing
          const waHref = await page.locator('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]').first().getAttribute("href").catch(() => null);
          let whatsapp: string | null = null;
          if (waHref) {
            const m = waHref.match(/(?:wa\.me\/|phone=)(\+?[\d]{7,15})/);
            if (m) whatsapp = "+" + m[1].replace(/^\+/, "");
          }

          const reviewCount = reviews ? reviews.match(/[\d,]+/)?.[0]?.replace(",", "") ?? null : null;

          appendFileSync(csvPath, toRow({
            name:            name.trim(),
            category:        category?.trim() ?? target.searchCategory,
            search_category: target.searchCategory,
            address:         address?.trim() ?? null,
            phone:           phone?.trim() ?? null,
            whatsapp:        whatsapp,
            website:         website ?? null,
            rating:          rating?.trim().replace(",", ".") ?? null,
            review_count:    reviewCount,
            city:            target.city,
            state:           target.state ?? null,
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
