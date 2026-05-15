# Uncovered Industries — Expansion Targets

**Generated:** 2026-05-14  
**Status:** Scraper ready (`scripts/scrape-gmaps2.ts`) — pending run  
**Estimated new leads:** ~10,000–15,000 across 22 countries  

---

## Why These Industries

The initial 30,585 leads cover gyms, salons, restaurants, clinics, law firms, and hotels well.  
The niches below were absent from Phase 1–5 scrapes but each has a clear, concrete pitch for a website or web app.

---

## 16 New Niches

### 1. Driving Schools
**Domain tag:** `crm`  
**Why they need a website/app:** Online lesson booking, student progress tracking, theory-test prep portal, automated reminders before practical exams.  
**Pitch angle:** "Replace phone bookings and WhatsApp chaos — let students book, reschedule, and track hours online."  
**Search terms:** `driving school`, `autofahrschule`, `école de conduite`

---

### 2. Cleaning Services
**Domain tag:** `crm`  
**Why they need a website/app:** Service booking calendar, recurring-job management, before/after photo uploads, quote calculator, online payment.  
**Pitch angle:** "Automated recurring bookings + customer portal = fewer missed appointments and faster payment."  
**Search terms:** `cleaning service`, `reinigungsservice`, `nettoyage`

---

### 3. Plumbers
**Domain tag:** `no_website`  
**Why they need a website/app:** Emergency call button, service-area map, instant quote form, reviews showcase — most plumbers have zero online presence.  
**Pitch angle:** "Show up on Google when someone searches 'plumber near me' — right now your competitors get that call."  
**Search terms:** `plumber`, `klempner`, `loodgieter`

---

### 4. Electricians
**Domain tag:** `no_website`  
**Why they need a website/app:** Same as plumbers — local SEO landing page, quote request form, certifications display, emergency contact CTA.  
**Pitch angle:** "A one-page site with a 'Request a quote' form pays for itself in the first job."  
**Search terms:** `electrician`, `elektriker`, `électricien`

---

### 5. Dog Grooming
**Domain tag:** `crm`  
**Why they need a website/app:** Appointment booking by breed/size, recurring grooming reminders, before/after gallery, loyalty program.  
**Pitch angle:** "Clients forget to rebook — automated reminders every 6–8 weeks fill your calendar without a single phone call."  
**Search terms:** `dog grooming`, `hundepflege`, `toilettage chien`

---

### 6. Tattoo Studios
**Domain tag:** `crm`  
**Why they need a website/app:** Portfolio gallery, artist profile pages, deposit-secured booking, aftercare instructions, waitlist management.  
**Pitch angle:** "A slick portfolio site with online booking turns Instagram followers into confirmed appointments."  
**Search terms:** `tattoo studio`, `tattoo parlour`, `tätowierstudio`

---

### 7. Psychologists / Therapists
**Domain tag:** `health`  
**Why they need a website/app:** GDPR-compliant intake forms, secure video session booking, session notes portal, insurance documentation.  
**Pitch angle:** "Patients expect discretion — a professional booking page with encrypted intake forms builds trust before the first session."  
**Search terms:** `psychologist`, `psychologe`, `psycholoog`, `thérapeute`

---

### 8. Photographers
**Domain tag:** `crm`  
**Why they need a website/app:** Portfolio galleries, package pricing pages, booking + deposit flow, client proofing galleries, digital delivery.  
**Pitch angle:** "Stop sending Google Drive links — a branded client gallery with download access looks professional and gets referrals."  
**Search terms:** `photographer`, `fotograf`, `photographe`

---

### 9. Opticians / Optical Shops
**Domain tag:** `health`  
**Why they need a website/app:** Frame catalogue, eye-test appointment booking, prescription management, lens configurator.  
**Pitch angle:** "Let patients book their annual check-up online and browse frames before they walk in — reduce chair time, increase sales."  
**Search terms:** `optician`, `optiker`, `opticien`

---

### 10. Music Schools
**Domain tag:** `crm`  
**Why they need a website/app:** Trial lesson booking, teacher profiles, instrument/class catalogue, term-based enrolment, recital event pages.  
**Pitch angle:** "Parents want to compare teachers and book a trial lesson at 10 pm — if you don't have that, the school down the road gets the signup."  
**Search terms:** `music school`, `musikschule`, `école de musique`

---

### 11. Wedding Services (Planners / Venues)
**Domain tag:** `crm`  
**Why they need a website/app:** Package configurator, availability calendar, vendor gallery, inquiry + quote workflow, real wedding portfolio.  
**Pitch angle:** "Couples spend 80% of their research time online — a beautiful portfolio with an inquiry form converts browsers into booked clients."  
**Search terms:** `wedding planner`, `hochzeitsplaner`, `wedding venue`

---

### 12. Florists
**Domain tag:** `crm`  
**Why they need a website/app:** Online shop (bouquets, arrangements), same-day delivery booking, event/wedding inquiry form, subscription flower service.  
**Pitch angle:** "Valentine's Day, Mother's Day, anniversaries — a simple online shop captures impulse orders you'd otherwise lose to supermarkets."  
**Search terms:** `florist`, `blumenladen`, `fleuriste`

---

### 13. Catering Companies
**Domain tag:** `crm`  
**Why they need a website/app:** Event inquiry + quote form, menu builder, capacity calculator, photo gallery, testimonials.  
**Pitch angle:** "Corporate clients won't call — they fill out a form. If you don't have one, the RFQ goes to whoever does."  
**Search terms:** `catering`, `catering service`, `traiteur`

---

### 14. Escape Rooms
**Domain tag:** `crm`  
**Why they need a website/app:** Real-time slot booking, group-size selector, gift voucher shop, leaderboard, corporate team-building landing page.  
**Pitch angle:** "90% of escape room bookings happen online — no booking widget = lost revenue every single day."  
**Search terms:** `escape room`, `escaperoom`, `salle d'évasion`

---

### 15. Notaries
**Domain tag:** `b2b`  
**Why they need a website/app:** Service explainer pages, appointment booking, document checklist generator, fee calculator, secure document upload.  
**Pitch angle:** "Clients research notaries online before calling — a clear, professional site with an appointment form reduces friction and no-shows."  
**Search terms:** `notary`, `notar`, `notaire`, `notaio`

---

### 16. Kindergartens / Preschools
**Domain tag:** `crm`  
**Why they need a website/app:** Enrollment inquiry forms, daily activity updates for parents, photo galleries, event calendar, waitlist management.  
**Pitch angle:** "Parents tour 3–5 options before deciding — a warm, informative site with an easy inquiry form puts you on the shortlist."  
**Search terms:** `kindergarten`, `preschool`, `kita`, `école maternelle`

---

## Running the Scraper

```bash
# Single niche, single country
npx tsx scripts/scrape-gmaps2.ts --niche driving_schools --country Germany

# Single niche, all countries
npx tsx scripts/scrape-gmaps2.ts --niche escape_rooms

# All niches, one country
npx tsx scripts/scrape-gmaps2.ts --country UAE

# All niches, all countries (full run — ~2–3 days)
npx tsx scripts/scrape-gmaps2.ts

# Debug with browser visible
npx tsx scripts/scrape-gmaps2.ts --niche florists --country Ireland --limit 30 --visible
```

Output CSVs land in: `scraper/new_industries/<country>/<niche>.csv`

Import after scraping:

```bash
npx tsx scripts/import-leads.ts
```

---

## Domain Tag Summary

| Domain tag   | Niches |
|---|---|
| `crm`        | Driving Schools, Cleaning, Dog Grooming, Tattoo Studios, Photographers, Music Schools, Wedding, Florists, Catering, Escape Rooms, Kindergartens |
| `no_website` | Plumbers, Electricians |
| `health`     | Psychologists, Opticians |
| `b2b`        | Notaries |

---

## Priority Order (by pitch strength + volume estimate)

| # | Niche | Est. leads | Pitch strength |
|---|---|---:|---|
| 1 | Cleaning Services | 2,000+ | High — universal need, easy ROI story |
| 2 | Plumbers | 1,500+ | Very high — no website = free money |
| 3 | Electricians | 1,500+ | Very high — same as plumbers |
| 4 | Escape Rooms | 800+ | Very high — online booking is their lifeblood |
| 5 | Dog Grooming | 1,200+ | High — repeat customers, reminder automation |
| 6 | Photographers | 1,000+ | High — portfolio + booking = obvious win |
| 7 | Driving Schools | 1,000+ | High — scheduling complexity they hate |
| 8 | Tattoo Studios | 900+ | Medium-high — portfolio + deposit system |
| 9 | Music Schools | 700+ | Medium — seasonal, but enrolment flow matters |
| 10 | Florists | 700+ | Medium — e-commerce pitch is clear |
| 11 | Catering | 600+ | Medium — B2B inquiry form is the hook |
| 12 | Wedding Planners | 500+ | Medium — high-ticket, long sales cycle |
| 13 | Psychologists | 500+ | Medium — GDPR angle makes it premium |
| 14 | Opticians | 600+ | Medium — health domain, appointment booking |
| 15 | Notaries | 400+ | Medium — B2B, slower decision cycle |
| 16 | Kindergartens | 500+ | Medium — enrollment UX is the pitch |
