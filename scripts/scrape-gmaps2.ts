#!/usr/bin/env tsx
/**
 * Google Maps scraper v2 — Uncovered industries
 * New niches: driving schools, cleaning, plumbers, electricians, dog grooming,
 *             tattoo studios, psychologists, photographers, opticians, music schools,
 *             wedding planners, florists, catering, escape rooms, notaries, kindergartens
 *
 * Usage:
 *   npx tsx scripts/scrape-gmaps2.ts
 *   npx tsx scripts/scrape-gmaps2.ts --country Germany --visible
 *   npx tsx scripts/scrape-gmaps2.ts --niche tattoo_studios --visible
 *   npx tsx scripts/scrape-gmaps2.ts --limit 40
 *
 * Output: f:/scraper/new_industries/{country}_{niche}.csv
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

const RESULTS_PER_SEARCH = 120;
const DETAIL_DELAY_MS    = 800;
const SCROLL_DELAY_MS    = 1200;

// ─── Target interface ─────────────────────────────────────────────────────────

interface Target {
  country: string;
  city: string;
  query: string;
  searchCategory: string;
  niche: string;
  domain: "b2b" | "crm" | "health" | "tourism" | "no_website";
}

// ─── TARGETS ─────────────────────────────────────────────────────────────────
// ~500 searches across 16 new niches × 22 countries

const TARGETS: Target[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // 1. DRIVING SCHOOLS
  // ══════════════════════════════════════════════════════════════════════════
  // Germany
  { country: "Germany",     city: "Berlin",      query: "Fahrschule Berlin",             searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Fahrschule München",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Fahrschule Hamburg",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Germany",     city: "Frankfurt",   query: "Fahrschule Frankfurt",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Fahrschule Köln",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // Austria
  { country: "Austria",     city: "Vienna",      query: "Fahrschule Wien",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Austria",     city: "Graz",        query: "Fahrschule Graz",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Austria",     city: "Linz",        query: "Fahrschule Linz",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // Switzerland
  { country: "Switzerland", city: "Zurich",      query: "Fahrschule Zürich",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Switzerland", city: "Basel",       query: "Fahrschule Basel",             searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Switzerland", city: "Geneva",      query: "auto-école Genève",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Switzerland", city: "Lausanne",    query: "auto-école Lausanne",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // Belgium
  { country: "Belgium",     city: "Brussels",    query: "auto-école Bruxelles",         searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "rijschool Antwerpen",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Belgium",     city: "Ghent",       query: "rijschool Gent",               searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Belgium",     city: "Liège",       query: "auto-école Liège",             searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // Netherlands
  { country: "Netherlands", city: "Amsterdam",   query: "rijschool Amsterdam",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "rijschool Rotterdam",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Netherlands", city: "Utrecht",     query: "rijschool Utrecht",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Netherlands", city: "Den Haag",    query: "rijschool Den Haag",           searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // Scandinavia
  { country: "Sweden",      city: "Stockholm",   query: "körskola Stockholm",           searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Sweden",      city: "Gothenburg",  query: "körskola Göteborg",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "trafikkskole Oslo",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Norway",      city: "Bergen",      query: "trafikkskole Bergen",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "køreskole København",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Denmark",     city: "Aarhus",      query: "køreskole Aarhus",             searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // South Europe
  { country: "Italy",       city: "Rome",        query: "autoscuola Roma",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "autoscuola Milano",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Italy",       city: "Naples",      query: "autoscuola Napoli",            searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "autoescuela Madrid",           searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "autoescuela Barcelona",        searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Spain",       city: "Valencia",    query: "autoescuela Valencia",         searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "escola de condução Lisboa",    searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Portugal",    city: "Porto",       query: "escola de condução Porto",     searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // East Europe
  { country: "Poland",      city: "Warsaw",      query: "szkoła jazdy Warszawa",        searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Poland",      city: "Krakow",      query: "szkoła jazdy Kraków",          searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "scoala de soferi Bucuresti",   searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Romania",     city: "Cluj",        query: "scoala de soferi Cluj",        searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Croatia",     city: "Zagreb",      query: "autoškola Zagreb",             searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Greece",      city: "Athens",      query: "driving school Athens",        searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Bulgaria",    city: "Sofia",       query: "автошкола Sofia",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Czech Republic", city: "Prague",   query: "autoškola Praha",              searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Hungary",     city: "Budapest",    query: "autósiskola Budapest",         searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // Small Phase 1
  { country: "Ireland",     city: "Dublin",      query: "driving school Dublin",        searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "Estonia",     city: "Tallinn",     query: "autokool Tallinn",             searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  // UAE + USA
  { country: "UAE",         city: "Dubai",       query: "driving school Dubai",         searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "USA",         city: "New York",    query: "driving school New York",      searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "driving school Los Angeles",   searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },
  { country: "USA",         city: "Chicago",     query: "driving school Chicago",       searchCategory: "Driving School", niche: "driving_schools", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 2. CLEANING COMPANIES
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Reinigungsfirma Berlin",       searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Reinigungsfirma München",      searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Gebäudereinigung Hamburg",     searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Reinigungsunternehmen Köln",  searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Reinigungsfirma Wien",         searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Austria",     city: "Graz",        query: "Reinigungsfirma Graz",         searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Reinigungsunternehmen Zürich", searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Switzerland", city: "Geneva",      query: "entreprise de nettoyage Genève", searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "entreprise de nettoyage Bruxelles", searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "schoonmaakbedrijf Antwerpen",  searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "schoonmaakbedrijf Amsterdam",  searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "schoonmaakbedrijf Rotterdam",  searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "städfirma Stockholm",          searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "renholdsfirma Oslo",           searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "rengøringsfirma København",    searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "impresa di pulizie Roma",      searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "impresa di pulizie Milano",    searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "empresa de limpieza Madrid",   searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "empresa de limpieza Barcelona", searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "empresa de limpeza Lisboa",    searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "firma sprzątająca Warszawa",   searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "firma de curatenie Bucuresti", searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Croatia",     city: "Zagreb",      query: "usluge čišćenja Zagreb",       searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "cleaning company Dubai",       searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "USA",         city: "New York",    query: "cleaning company New York",    searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "cleaning company Los Angeles", searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },
  { country: "Ireland",     city: "Dublin",      query: "cleaning company Dublin",      searchCategory: "Cleaning Company", niche: "cleaning", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 3. PLUMBERS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Klempner Berlin",              searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Germany",     city: "Munich",      query: "Klempner München",             searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Germany",     city: "Hamburg",     query: "Installateur Hamburg",         searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Germany",     city: "Frankfurt",   query: "Sanitär Frankfurt",            searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Austria",     city: "Vienna",      query: "Installateur Wien",            searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Austria",     city: "Graz",        query: "Installateur Graz",            searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Switzerland", city: "Zurich",      query: "Sanitär Zürich",               searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Belgium",     city: "Brussels",    query: "plombier Bruxelles",           searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Belgium",     city: "Antwerp",     query: "loodgieter Antwerpen",         searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Netherlands", city: "Amsterdam",   query: "loodgieter Amsterdam",         searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Netherlands", city: "Rotterdam",   query: "loodgieter Rotterdam",         searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Sweden",      city: "Stockholm",   query: "VVS-firma Stockholm",          searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Norway",      city: "Oslo",        query: "rørlegger Oslo",               searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Denmark",     city: "Copenhagen",  query: "VVS-firma København",          searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Italy",       city: "Rome",        query: "idraulico Roma",               searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Italy",       city: "Milan",       query: "idraulico Milano",             searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Italy",       city: "Naples",      query: "idraulico Napoli",             searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Spain",       city: "Madrid",      query: "fontanero Madrid",             searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Spain",       city: "Barcelona",   query: "fontanero Barcelona",          searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Portugal",    city: "Lisbon",      query: "canalizador Lisboa",           searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Portugal",    city: "Porto",       query: "canalizador Porto",            searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Poland",      city: "Warsaw",      query: "hydraulik Warszawa",           searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Romania",     city: "Bucharest",   query: "instalator Bucuresti",         searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Greece",      city: "Athens",      query: "υδραυλικός Αθήνα",            searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "UAE",         city: "Dubai",       query: "plumber Dubai",                searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "USA",         city: "New York",    query: "plumber New York",             searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "USA",         city: "Chicago",     query: "plumber Chicago",              searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },
  { country: "Ireland",     city: "Dublin",      query: "plumber Dublin",               searchCategory: "Plumber", niche: "plumbers", domain: "no_website" },

  // ══════════════════════════════════════════════════════════════════════════
  // 4. ELECTRICIANS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Elektriker Berlin",            searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Germany",     city: "Munich",      query: "Elektriker München",           searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Germany",     city: "Hamburg",     query: "Elektriker Hamburg",           searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Austria",     city: "Vienna",      query: "Elektriker Wien",              searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Switzerland", city: "Zurich",      query: "Elektriker Zürich",            searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Belgium",     city: "Brussels",    query: "électricien Bruxelles",        searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Netherlands", city: "Amsterdam",   query: "elektricien Amsterdam",        searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Netherlands", city: "Rotterdam",   query: "elektricien Rotterdam",        searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Sweden",      city: "Stockholm",   query: "elektriker Stockholm",         searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Norway",      city: "Oslo",        query: "elektriker Oslo",              searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Italy",       city: "Rome",        query: "elettricista Roma",            searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Italy",       city: "Milan",       query: "elettricista Milano",          searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Spain",       city: "Madrid",      query: "electricista Madrid",          searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Spain",       city: "Barcelona",   query: "electricista Barcelona",       searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Portugal",    city: "Lisbon",      query: "eletricista Lisboa",           searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Poland",      city: "Warsaw",      query: "elektryk Warszawa",            searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Romania",     city: "Bucharest",   query: "electrician Bucuresti",        searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "UAE",         city: "Dubai",       query: "electrician Dubai",            searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "USA",         city: "New York",    query: "electrician New York",         searchCategory: "Electrician", niche: "electricians", domain: "no_website" },
  { country: "Ireland",     city: "Dublin",      query: "electrician Dublin",           searchCategory: "Electrician", niche: "electricians", domain: "no_website" },

  // ══════════════════════════════════════════════════════════════════════════
  // 5. DOG GROOMING
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Hundesalon Berlin",            searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Hundesalon München",           searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Hundepflege Hamburg",          searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Hundesalon Köln",             searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Hundesalon Wien",              searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Hundepflege Zürich",           searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "salon de toilettage Bruxelles", searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "hondentrimsalon Antwerpen",    searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "hondentrimsalon Amsterdam",    searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "hondentrimsalon Rotterdam",    searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "hundfrisör Stockholm",         searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "hundesalong Oslo",             searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "hundesalon København",         searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "toelettatura cani Roma",       searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "toelettatura cani Milano",     searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "peluquería canina Madrid",     searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "peluquería canina Barcelona",  searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "tosquiador de cães Lisboa",    searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "salon dla psów Warszawa",      searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "salon canin Bucuresti",        searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Croatia",     city: "Zagreb",      query: "frizerski salon za pse Zagreb", searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "dog grooming Dubai",           searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "USA",         city: "New York",    query: "dog grooming New York",        searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "dog grooming Los Angeles",     searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },
  { country: "Ireland",     city: "Dublin",      query: "dog grooming Dublin",          searchCategory: "Dog Grooming", niche: "dog_grooming", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 6. TATTOO STUDIOS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Tattoo Studio Berlin",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Tattoo Studio München",        searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Tattoo Studio Hamburg",        searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Tattoo Shop Köln",            searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Tattoo Studio Wien",           searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Tattoo Studio Zürich",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "tattoo shop Bruxelles",        searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "tattoo shop Antwerpen",        searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "tattoo shop Amsterdam",        searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "tattoo shop Rotterdam",        searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "tatueringsstudio Stockholm",   searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "tatoveringsstudio Oslo",       searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "tattoo studio København",      searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "studio tatuaggi Roma",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "studio tatuaggi Milano",       searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Italy",       city: "Florence",    query: "studio tatuaggi Firenze",      searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "estudio de tatuajes Madrid",   searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "estudio de tatuajes Barcelona", searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "estúdio de tatuagem Lisboa",   searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "salon tatuażu Warszawa",       searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Poland",      city: "Krakow",      query: "salon tatuażu Kraków",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "studio tatuaje Bucuresti",     searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Croatia",     city: "Zagreb",      query: "tattoo studio Zagreb",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Greece",      city: "Athens",      query: "tattoo studio Athens",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "tattoo studio Dubai",          searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "USA",         city: "New York",    query: "tattoo shop New York",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "tattoo shop Los Angeles",      searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },
  { country: "Ireland",     city: "Dublin",      query: "tattoo studio Dublin",         searchCategory: "Tattoo Studio", niche: "tattoo_studios", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 7. PSYCHOLOGISTS / THERAPISTS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Psychologe Berlin",            searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Germany",     city: "Munich",      query: "Psychotherapeut München",      searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Germany",     city: "Hamburg",     query: "Psychologe Hamburg",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Germany",     city: "Frankfurt",   query: "Psychotherapeut Frankfurt",    searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Austria",     city: "Vienna",      query: "Psychologe Wien",              searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Austria",     city: "Graz",        query: "Psychotherapeut Graz",         searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Switzerland", city: "Zurich",      query: "Psychologe Zürich",            searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Switzerland", city: "Geneva",      query: "psychologue Genève",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Belgium",     city: "Brussels",    query: "psychologue Bruxelles",        searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Belgium",     city: "Antwerp",     query: "psycholoog Antwerpen",         searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Netherlands", city: "Amsterdam",   query: "psycholoog Amsterdam",         searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Netherlands", city: "Rotterdam",   query: "psycholoog Rotterdam",         searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Netherlands", city: "Den Haag",    query: "psycholoog Den Haag",          searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Sweden",      city: "Stockholm",   query: "psykolog Stockholm",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Norway",      city: "Oslo",        query: "psykolog Oslo",                searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Denmark",     city: "Copenhagen",  query: "psykolog København",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Italy",       city: "Rome",        query: "psicologo Roma",               searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Italy",       city: "Milan",       query: "psicologo Milano",             searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Italy",       city: "Naples",      query: "psicologo Napoli",             searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Spain",       city: "Madrid",      query: "psicólogo Madrid",             searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Spain",       city: "Barcelona",   query: "psicólogo Barcelona",          searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Spain",       city: "Valencia",    query: "psicólogo Valencia",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Portugal",    city: "Lisbon",      query: "psicólogo Lisboa",             searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Portugal",    city: "Porto",       query: "psicólogo Porto",              searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Poland",      city: "Warsaw",      query: "psycholog Warszawa",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Romania",     city: "Bucharest",   query: "psiholog Bucuresti",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Croatia",     city: "Zagreb",      query: "psiholog Zagreb",              searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Greece",      city: "Athens",      query: "ψυχολόγος Αθήνα",             searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "UAE",         city: "Dubai",       query: "psychologist Dubai",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "USA",         city: "New York",    query: "therapist New York",           searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "USA",         city: "Los Angeles", query: "therapist Los Angeles",        searchCategory: "Psychologist", niche: "psychologists", domain: "health" },
  { country: "Ireland",     city: "Dublin",      query: "psychologist Dublin",          searchCategory: "Psychologist", niche: "psychologists", domain: "health" },

  // ══════════════════════════════════════════════════════════════════════════
  // 8. PHOTOGRAPHERS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Fotograf Berlin",              searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Fotograf München",             searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Fotograf Hamburg",             searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Fotograf Köln",               searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Fotograf Wien",                searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Fotograf Zürich",              searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "photographe Bruxelles",        searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "fotograaf Antwerpen",          searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "fotograaf Amsterdam",          searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "fotograaf Rotterdam",          searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "fotograf Stockholm",           searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "fotograf Oslo",                searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "fotografo Roma",               searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "fotografo Milano",             searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "fotógrafo Madrid",             searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "fotógrafo Barcelona",          searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "fotógrafo Lisboa",             searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "fotograf Warszawa",            searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "fotograf Bucuresti",           searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "photographer Dubai",           searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "USA",         city: "New York",    query: "photographer New York",        searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "photographer Los Angeles",     searchCategory: "Photographer", niche: "photographers", domain: "crm" },
  { country: "Ireland",     city: "Dublin",      query: "photographer Dublin",          searchCategory: "Photographer", niche: "photographers", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 9. OPTICIANS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Optiker Berlin",               searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Germany",     city: "Munich",      query: "Optiker München",              searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Germany",     city: "Hamburg",     query: "Optiker Hamburg",              searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Austria",     city: "Vienna",      query: "Optiker Wien",                 searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Switzerland", city: "Zurich",      query: "Optiker Zürich",               searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Belgium",     city: "Brussels",    query: "opticien Bruxelles",           searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Belgium",     city: "Antwerp",     query: "opticien Antwerpen",           searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Netherlands", city: "Amsterdam",   query: "opticien Amsterdam",           searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Netherlands", city: "Rotterdam",   query: "opticien Rotterdam",           searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Sweden",      city: "Stockholm",   query: "optiker Stockholm",            searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Norway",      city: "Oslo",        query: "optiker Oslo",                 searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Denmark",     city: "Copenhagen",  query: "optiker København",            searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Italy",       city: "Rome",        query: "ottico Roma",                  searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Italy",       city: "Milan",       query: "ottico Milano",                searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Spain",       city: "Madrid",      query: "óptica Madrid",                searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Spain",       city: "Barcelona",   query: "óptica Barcelona",             searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Portugal",    city: "Lisbon",      query: "ótica Lisboa",                 searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Poland",      city: "Warsaw",      query: "optyk Warszawa",               searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "Romania",     city: "Bucharest",   query: "optica Bucuresti",             searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "UAE",         city: "Dubai",       query: "optician Dubai",               searchCategory: "Optician", niche: "opticians", domain: "health" },
  { country: "USA",         city: "New York",    query: "optician New York",            searchCategory: "Optician", niche: "opticians", domain: "health" },

  // ══════════════════════════════════════════════════════════════════════════
  // 10. MUSIC SCHOOLS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Musikschule Berlin",           searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Musikschule München",          searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Musikschule Hamburg",          searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Musikschule Wien",             searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Musikschule Zürich",           searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "muziekschool Amsterdam",       searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "école de musique Bruxelles",   searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "musikskola Stockholm",         searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "scuola di musica Roma",        searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "scuola di musica Milano",      searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "escuela de música Madrid",     searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "escuela de música Barcelona",  searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "escola de música Lisboa",      searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "szkoła muzyczna Warszawa",     searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "scoala de muzica Bucuresti",   searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "music school Dubai",           searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "USA",         city: "New York",    query: "music school New York",        searchCategory: "Music School", niche: "music_schools", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "music school Los Angeles",     searchCategory: "Music School", niche: "music_schools", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 11. WEDDING PLANNERS / VENUES
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Hochzeitsplaner Berlin",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Hochzeitslocation München",    searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Hochzeitsplaner Hamburg",      searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Hochzeitsplaner Wien",         searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Hochzeitsplaner Zürich",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "wedding planner Bruxelles",    searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "trouwlocatie Amsterdam",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "wedding planner Roma",         searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "wedding planner Milano",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Italy",       city: "Florence",    query: "location matrimoni Firenze",   searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "wedding planner Madrid",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "wedding planner Barcelona",    searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "wedding planner Lisboa",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Portugal",    city: "Porto",       query: "wedding planner Porto",        searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "wedding planner Warszawa",     searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "wedding planner Bucuresti",    searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Croatia",     city: "Zagreb",      query: "wedding planner Zagreb",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Croatia",     city: "Split",       query: "wedding venue Split",          searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Greece",      city: "Athens",      query: "wedding planner Athens",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "wedding planner Dubai",        searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "USA",         city: "New York",    query: "wedding planner New York",     searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "wedding planner Los Angeles",  searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },
  { country: "Ireland",     city: "Dublin",      query: "wedding planner Dublin",       searchCategory: "Wedding Planner", niche: "wedding", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 12. FLORISTS (expanded coverage)
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Blumenladen Berlin",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Florist München",              searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Blumenladen Hamburg",          searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Blumenladen Köln",            searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Florist Wien",                 searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Blumenladen Zürich",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "fleuriste Bruxelles",          searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "bloemist Antwerpen",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "bloemist Amsterdam",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "bloemist Rotterdam",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "blomsterhandel Stockholm",     searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "blomsterbutikk Oslo",          searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "blomsterhandler København",    searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "fiorista Roma",                searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "fiorista Milano",              searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "floristería Madrid",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "floristería Barcelona",        searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "florista Lisboa",              searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "kwiaciarnia Warszawa",         searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "florarie Bucuresti",           searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "Romania",     city: "Cluj",        query: "florarie Cluj",                searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "florist Dubai",                searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "USA",         city: "New York",    query: "florist New York",             searchCategory: "Florist", niche: "florists", domain: "crm" },
  { country: "USA",         city: "Chicago",     query: "florist Chicago",              searchCategory: "Florist", niche: "florists", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 13. CATERING
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Catering Berlin",              searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Catering München",             searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Cateringservice Hamburg",      searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Catering Wien",                searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Catering Zürich",              searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "traiteur Bruxelles",           searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "cateringbedrijf Amsterdam",    searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "catering Roma",                searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "catering Milano",              searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "empresa de catering Madrid",   searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "empresa de catering Barcelona", searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "empresa de catering Lisboa",   searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "catering Warszawa",            searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "catering Bucuresti",           searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "catering company Dubai",       searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "USA",         city: "New York",    query: "catering company New York",    searchCategory: "Catering", niche: "catering", domain: "crm" },
  { country: "USA",         city: "Chicago",     query: "catering company Chicago",     searchCategory: "Catering", niche: "catering", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 14. ESCAPE ROOMS
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Escape Room Berlin",           searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Escape Room München",          searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Escape Room Hamburg",          searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Germany",     city: "Cologne",     query: "Escape Room Köln",            searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Escape Room Wien",             searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Escape Room Zürich",           searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "escape room Bruxelles",        searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "escape room Amsterdam",        searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "escape room Stockholm",        searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "escape room København",        searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "escape room Roma",             searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "escape room Milano",           searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "escape room Madrid",           searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "escape room Barcelona",        searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "escape room Warszawa",         searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Poland",      city: "Krakow",      query: "escape room Kraków",           searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "escape room Bucuresti",        searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Croatia",     city: "Zagreb",      query: "escape room Zagreb",           searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Czech Republic", city: "Prague",   query: "escape room Praha",            searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "Hungary",     city: "Budapest",    query: "escape room Budapest",         searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "escape room Dubai",            searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "USA",         city: "New York",    query: "escape room New York",         searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "escape room Los Angeles",      searchCategory: "Escape Room", niche: "escape_rooms", domain: "crm" },

  // ══════════════════════════════════════════════════════════════════════════
  // 15. NOTARIES (DACH + Benelux + South Europe)
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Notar Berlin",                 searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Germany",     city: "Munich",      query: "Notar München",                searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Germany",     city: "Hamburg",     query: "Notar Hamburg",                searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Germany",     city: "Frankfurt",   query: "Notar Frankfurt",              searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Germany",     city: "Cologne",     query: "Notar Köln",                  searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Austria",     city: "Vienna",      query: "Notar Wien",                   searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Austria",     city: "Graz",        query: "Notar Graz",                   searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Austria",     city: "Linz",        query: "Notar Linz",                   searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Switzerland", city: "Zurich",      query: "Notar Zürich",                 searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Switzerland", city: "Geneva",      query: "notaire Genève",               searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Switzerland", city: "Basel",       query: "Notar Basel",                  searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Belgium",     city: "Brussels",    query: "notaire Bruxelles",            searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Belgium",     city: "Antwerp",     query: "notaris Antwerpen",            searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Belgium",     city: "Ghent",       query: "notaris Gent",                 searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Belgium",     city: "Liège",       query: "notaire Liège",                searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Netherlands", city: "Amsterdam",   query: "notaris Amsterdam",            searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Netherlands", city: "Rotterdam",   query: "notaris Rotterdam",            searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Netherlands", city: "Utrecht",     query: "notaris Utrecht",              searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Italy",       city: "Rome",        query: "notaio Roma",                  searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Italy",       city: "Milan",       query: "notaio Milano",                searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Italy",       city: "Naples",      query: "notaio Napoli",                searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Spain",       city: "Madrid",      query: "notaría Madrid",               searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Spain",       city: "Barcelona",   query: "notaría Barcelona",            searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Spain",       city: "Valencia",    query: "notaría Valencia",             searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Portugal",    city: "Lisbon",      query: "notário Lisboa",               searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Portugal",    city: "Porto",       query: "notário Porto",                searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Poland",      city: "Warsaw",      query: "notariusz Warszawa",           searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Romania",     city: "Bucharest",   query: "notar Bucuresti",              searchCategory: "Notary", niche: "notaries", domain: "b2b" },
  { country: "Croatia",     city: "Zagreb",      query: "javni bilježnik Zagreb",       searchCategory: "Notary", niche: "notaries", domain: "b2b" },

  // ══════════════════════════════════════════════════════════════════════════
  // 16. KINDERGARTENS / PRIVATE NURSERIES
  // ══════════════════════════════════════════════════════════════════════════
  { country: "Germany",     city: "Berlin",      query: "Kita Berlin",                  searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Germany",     city: "Munich",      query: "Kindergarten München",         searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Germany",     city: "Hamburg",     query: "Kindertagesstätte Hamburg",   searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Germany",     city: "Frankfurt",   query: "Kita Frankfurt",               searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Austria",     city: "Vienna",      query: "Kindergarten Wien",            searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Austria",     city: "Graz",        query: "Kindergarten Graz",            searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Switzerland", city: "Zurich",      query: "Kindertagesstätte Zürich",    searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Belgium",     city: "Brussels",    query: "crèche Bruxelles",             searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Belgium",     city: "Antwerp",     query: "kinderdagverblijf Antwerpen",  searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Netherlands", city: "Amsterdam",   query: "kinderdagverblijf Amsterdam",  searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Netherlands", city: "Rotterdam",   query: "kinderdagverblijf Rotterdam",  searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Sweden",      city: "Stockholm",   query: "förskola Stockholm",           searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Norway",      city: "Oslo",        query: "barnehage Oslo",               searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Denmark",     city: "Copenhagen",  query: "vuggestue København",          searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Italy",       city: "Rome",        query: "asilo nido Roma",              searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Italy",       city: "Milan",       query: "asilo nido Milano",            searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Spain",       city: "Madrid",      query: "guardería Madrid",             searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Spain",       city: "Barcelona",   query: "guardería Barcelona",          searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Portugal",    city: "Lisbon",      query: "jardim de infância Lisboa",    searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Poland",      city: "Warsaw",      query: "żłobek Warszawa",              searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Romania",     city: "Bucharest",   query: "gradinita privata Bucuresti",  searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Romania",     city: "Cluj",        query: "gradinita privata Cluj",       searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "UAE",         city: "Dubai",       query: "nursery Dubai",                searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "USA",         city: "New York",    query: "daycare center New York",      searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "USA",         city: "Los Angeles", query: "daycare center Los Angeles",   searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },
  { country: "Ireland",     city: "Dublin",      query: "creche Dublin",                searchCategory: "Kindergarten", niche: "kindergartens", domain: "crm" },

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

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args          = process.argv.slice(2);
  const filterCountry = args.includes("--country") ? args[args.indexOf("--country") + 1] : null;
  const filterNiche   = args.includes("--niche")   ? args[args.indexOf("--niche") + 1]   : null;
  const limitArg      = args.includes("--limit")   ? parseInt(args[args.indexOf("--limit") + 1]) : RESULTS_PER_SEARCH;
  const headless      = !args.includes("--visible");

  const OUTPUT_DIR = join(__dirname, "../../scraper/new_industries");

  let targets = TARGETS;
  if (filterCountry) targets = targets.filter(t => t.country.toLowerCase() === filterCountry.toLowerCase());
  if (filterNiche)   targets = targets.filter(t => t.niche === filterNiche);

  console.log(`\n🗺  Google Maps Scraper v2 — New Industries`);
  console.log(`   Targets : ${targets.length} searches`);
  console.log(`   Limit   : ${limitArg} per search`);
  console.log(`   Output  : ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

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
      const url = `https://www.google.com/maps/search/${encodeURIComponent(target.query)}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await delay(2000);

      const cookieBtn = page.locator('button:has-text("Accept all"), button:has-text("Accepteer"), button:has-text("Alle akzeptieren"), button:has-text("Accepter"), button:has-text("Accepter tout")');
      if (await cookieBtn.count() > 0) { await cookieBtn.first().click(); await delay(1000); }

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
      const startMs   = Date.now();

      for (let i = 0; i < total; i++) {
        try {
          const article = articles.nth(i);
          await article.scrollIntoViewIfNeeded();
          await article.click();
          await delay(DETAIL_DELAY_MS);

          if (!page.url().includes('/place/')) {
            await page.waitForURL('**/place/**', { timeout: 3000 }).catch(() => {});
          }

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
          const reviewCount = reviews ? reviews.match(/[\d,]+/)?.[0]?.replace(",", "") ?? null : null;

          appendFileSync(csvPath, toRow({
            name: name.trim(), category: category?.trim() ?? target.searchCategory,
            search_category: target.searchCategory, address: address?.trim() ?? null,
            phone: phone?.trim() ?? null, website: website ?? null,
            rating: rating?.trim().replace(",", ".") ?? null, review_count: reviewCount,
            city: target.city, country: target.country, maps_url: mapsUrl, scraped_at: scrapedAt,
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

main().catch(e => { console.error(e); process.exit(1); });
