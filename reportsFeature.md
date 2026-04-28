# Reports Feature — Concrete Email Data Hooks

Each task adds a scannable, verifiable data point about a lead's website that generates
a ready-to-paste pitch hook for cold emails. Same pattern as the Lighthouse audit.

---

## Already shipped

- [x] **Lighthouse audit** — Security headers, SEO signals, SEM tracking pixels.
      Scores 0–100 per category. Copy Lead + Audit generates email pitch angles.

---

## Easy (1–2 days each)

- [ ] **Page Speed check**
  Measure real load time via `fetch()` timing or call the free PageSpeed Insights API
  (`https://pagespeed.web.dev/` — no key needed).
  Store: mobile score, desktop score, load time ms.
  Hook: *"Your homepage takes 7 seconds to load on mobile. Google drops rankings for
  anything over 3 seconds — and 53% of mobile visitors leave before it finishes."*

- [ ] **SSL certificate expiry**
  Check cert expiry date via a public API (e.g. `ssl-checker.io` free endpoint).
  Store: expiry date, days remaining, issuer.
  Hook: *"Your SSL certificate expires in 12 days. When it lapses every browser blocks
  visitors with a full-screen red warning page."*

- [ ] **Mobile-friendliness check**
  Scan HTML for `<meta name="viewport">`, fixed-width tables, non-responsive images.
  Store: has_viewport, fixed_width_detected, touch_icon.
  Hook: *"Your site has no mobile viewport tag — over 60% of local searches happen on
  phones and your layout breaks on every one of them."*

- [ ] **Broken links / dead pages**
  Extract all `<a href>` links from the homepage, HEAD-request each one, flag 404s.
  Store: total_links, broken_count, broken_urls (JSON).
  Hook: *"We found 3 broken links on your homepage — visitors and Google bots both hit
  dead ends, which hurts your ranking."*

- [ ] **Google Business Profile completeness**
  Use the stored `mapsUrl` to detect: missing hours, photo count, rating below 4.0,
  unanswered reviews (parse the public Maps embed).
  Store: has_hours, photo_count, rating, review_count.
  Hook: *"Your Google profile shows no opening hours — customers searching on mobile
  can't see when you're open or call you directly from the results page."*

---

## Medium (3–5 days each)

- [ ] **Social media presence scan**
  Detect Facebook / Instagram / LinkedIn / TikTok links on the homepage, or probe
  `facebook.com/[slug]` / `instagram.com/[slug]` patterns.
  Store: has_facebook, has_instagram, has_linkedin, has_tiktok, follower_estimate.
  Hook: *"We couldn't find a Facebook or Instagram account linked from your website —
  your competitors are running retargeting ads to your past visitors while you have
  no social presence to retarget from."*

- [ ] **Review response rate**
  Already have `rating` and `reviewCount`. Cross-reference: rating < 4.2 + high count
  = low engagement signal worth mentioning.
  Store: response_rate_estimate, negative_review_count.
  Hook: *"With 47 reviews and a 3.8 rating, responding professionally to your negative
  reviews could recover 0.3–0.5 stars — which directly affects how often Google shows
  you in local results."*

- [ ] **Competitor comparison**
  Scrape top 3 Google results for `[category] [city]`, run Lighthouse on each, compare
  scores against the lead.
  Store: competitor_urls, competitor_avg_sec, competitor_avg_seo, competitor_avg_sem.
  Hook: *"The top result for 'barbershop Tallinn' has HTTPS, a sitemap, and GA4. You're
  competing without those basics — that's why they outrank you."*

- [ ] **Google search visibility**
  Estimate indexed pages via `site:domain.com` search (SerpAPI or scraper).
  Store: indexed_pages, has_rich_results, appears_in_maps.
  Hook: *"Google has indexed only 3 pages of your site. You have content that's
  completely invisible to search engines."*

---

## High value (1–2 weeks each)

- [ ] **Email deliverability check**
  DNS lookup of SPF, DKIM, DMARC records for the lead's domain.
  Store: has_spf, has_dkim, has_dmarc, spf_value.
  Hook: *"Your domain has no DMARC record — your business emails are statistically
  likely landing in the spam folder of every prospect you contact."*

- [ ] **AI content audit** (Claude API)
  Send homepage HTML to Claude. Evaluate: clear value proposition, CTA above the fold,
  copy quality, language match for the country.
  Store: vp_score, has_cta, language_match, ai_summary.
  Hook: *"Your homepage doesn't answer 'why choose you?' in the first 5 seconds —
  visitors leave before they read your offer."*

- [ ] **Uptime / recent downtime**
  Poll `isitdownrightnow.com` or similar free API. Check last 30 days.
  Store: uptime_pct, outage_count, last_outage_at.
  Hook: *"Your site was unreachable 3 times in the past 30 days — every outage means
  lost customers who visited and found nothing."*

---

## Priority order (recommended build sequence)

1. Page Speed — most visceral number, free API, no auth
2. SSL expiry — urgency hook, one API call
3. Mobile check — already parsing HTML, minimal extra work
4. Broken links — already fetching HTML, just check `<a>` tags
5. Email deliverability — DNS lookups, very fast, B2B leads especially
6. Social presence — adds breadth to the report
7. Competitor comparison — highest impact, most complex
8. AI content audit — premium tier, use Claude API
