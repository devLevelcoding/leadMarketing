# Lighthouse Scanner — LeadManager 0.9

Automated website auditor for your leads. Scans up to 200 sites at once and produces a scored report across three dimensions: **Security**, **SEO**, and **SEM**.

No external API keys needed — runs entirely with native HTTP requests.

---

## How to use

### 1. Open the page

Navigate to **Lighthouse** in the top navigation bar (added in 0.9).

### 2. Configure the scan

| Option | Description |
|---|---|
| **Phase** | Limit to Europe / Dubai / USA leads, or scan all phases |
| **Max leads** | 25 / 50 / 100 / 150 / 200 — picks leads with websites, newest first |

### 3. Run Scan

Click **Run Scan**. A live progress bar shows how many sites have been checked. Scans run 8 at a time in parallel with a 10-second timeout per site.

Results appear automatically when the scan finishes.

---

## Score breakdown

All three scores are **0–100**. Color coding:

| Color | Range | Meaning |
|---|---|---|
| 🟢 Green | 70–100 | Good |
| 🟡 Yellow | 40–69 | Needs improvement |
| 🔴 Red | 0–39 | Critical issues |

### 🔒 Security (headers)

Checks HTTP response headers — no JavaScript execution needed.

| Signal | Points | What it means |
|---|---|---|
| HTTPS | 30 | Site loads over a secure connection |
| HSTS | 15 | `Strict-Transport-Security` header present — browser never falls back to HTTP |
| XFO | 15 | `X-Frame-Options` present — prevents clickjacking |
| CSP | 20 | `Content-Security-Policy` present — limits injection attacks |
| XCTO | 10 | `X-Content-Type-Options` present — prevents MIME-sniffing |
| XSS | 10 | `X-XSS-Protection` present (legacy, still a signal) |

**Max: 100**

### 🔍 SEO (on-page signals)

Checks the raw HTML and two standard resource files.

| Signal | Points | What it means |
|---|---|---|
| `<title>` | 20 | Page has a non-empty title tag |
| Meta description | 20 | `<meta name="description">` present |
| `<h1>` | 15 | At least one H1 heading on the page |
| Canonical | 10 | `<link rel="canonical">` present — avoids duplicate-content issues |
| Open Graph | 10 | `og:title` or similar OG meta tags present |
| robots.txt | 15 | `/robots.txt` returns HTTP 200 |
| sitemap.xml | 10 | `/sitemap.xml` returns HTTP 200 |

**Max: 100**

### 📊 SEM (tracking pixels & structured data)

Detects marketing tools by scanning the HTML source for known patterns.

| Signal | Points | What it means |
|---|---|---|
| Google Analytics | 30 | `gtag()`, `analytics.js`, GA4 measurement ID, or `google-analytics.com` |
| Google Tag Manager | 20 | `gtm.js` script or `googletagmanager.com` |
| Facebook Pixel | 15 | `fbq()`, `connect.facebook.net/fbevents.js` |
| Schema.org | 15 | `application/ld+json`, `schema.org`, or `itemscope` attributes |
| LinkedIn Insight | 10 | `_linkedin_partner_id` or `snap.licdn.com` |
| Hotjar | 10 | `hotjar.com`, `hj()`, or `_hjSettings` |

**Max: 100**

---

## Filtering & sorting

- Click any score column header (**Sec / SEO / SEM**) to sort ascending or descending.
- Use the **filter dropdown** to show only:
  - *No HTTPS* — sites still on plain HTTP (easy sales pitch: SSL is broken or missing)
  - *Errors only* — sites that timed out or returned errors

---

## Export

Click **Export CSV** to download the full results as a spreadsheet. Includes all 23 signal columns, HTTP status codes, and error messages. Useful for building personalised outreach ("we noticed your site is missing a sitemap and CSP header…").

---

## Sales pitch angle

Low scores = opportunity. A lead with Security 10 / SEO 30 / SEM 0 has:

- No HTTPS or security headers → vulnerable site
- No meta description, no sitemap → invisible to Google
- No analytics or pixels → flying blind on traffic

That is a concrete, specific reason to reach out with a web-services offer.

---

## Technical notes

- Scanner runs server-side (Next.js API route) via **Server-Sent Events** so the browser sees live progress without polling.
- Each site has a hard **10-second timeout**. Slow or unreachable sites are recorded with an error message and 0 scores.
- Results are stored in the SQLite `lighthouse_scans` table. Running a new scan on the same set of leads **replaces** the previous results.
- Concurrency is **8 parallel** requests — fast enough for 100 leads in ~60–90 seconds without hammering a single origin.
