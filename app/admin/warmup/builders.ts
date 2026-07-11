import { fmtDate, DOMAIN_LABEL } from "@/lib/leadUtils";
import type { Lead, FullScan, LeadReport } from "./types";

export function fmtShort(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function interpolate(text: string, lead: Lead): string {
  return text
    .replace(/\{\{company_name\}\}/g, lead.name)
    .replace(/\{\{city\}\}/g, lead.city ?? "")
    .replace(/\{\{country\}\}/g, lead.country ?? "")
    .replace(/\{\{website\}\}/g, lead.website ?? "")
    .replace(/\{\{phone\}\}/g, lead.phone ?? "");
}

export function buildEmail(lead: Lead): { subject: string; body: string } {
  const location = [lead.city, lead.country].filter(Boolean).join(", ");
  const site = lead.website ? lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  const domainIntros: Record<string, { subject: string; p1: string; p2: string; p3: string; p4: string }> = {
    crm: {
      subject: `Grow your customer base — CRM & Digital Solutions for ${lead.name}`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} represents exactly the kind of business that benefits most from a modern CRM and digital infrastructure. For a ${lead.category ?? "retail"} business${site ? ` with an established online presence like ${site}` : ""}, managing customers, automating follow-ups, and building a loyalty programme can directly translate into repeat revenue and stronger brand recognition. In a competitive retail landscape, the businesses that win long-term are the ones that know their customers — their preferences, their purchase history, and the right moment to reach back out.`,
      p2: `We have helped businesses across Europe turn one-time customers into loyal regulars through custom CRM solutions, high-speed web platforms, and seamless mobile integrations. Our systems are built to handle high volumes of local and international clients while keeping data secure and the customer journey completely frictionless. Whether the goal is reducing cart abandonment, increasing average order value, or automating seasonal campaigns — we build the infrastructure that makes it happen quietly in the background while your team focuses on what they do best.`,
      p3: `One area where we consistently deliver outsized impact is in post-purchase communication. Most businesses spend heavily to acquire a customer and almost nothing to retain them. With a well-configured CRM and automated email sequences, you can re-engage past buyers at exactly the right moment — increasing lifetime value without increasing your marketing budget. We can audit your current setup, identify the gaps, and build a system tailored specifically to ${lead.name}'s customer base and ${lead.category ?? "product"} cycle.`,
      p4: `We also bring deep experience in integrating CRM platforms with existing Point-of-Sale systems, inventory tools, and e-commerce backends — so you get a unified view of every customer interaction, online and in-store. Our European client base means we understand GDPR compliance requirements inside out, and we build everything with data privacy as a foundation, not an afterthought.`,
    },
    no_website: {
      subject: `Get online and grow — Web Presence & Digital Strategy for ${lead.name}`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} is exactly the kind of local business that could unlock significant new revenue with the right digital presence. In today's market, customers search online before they walk through the door — and without a website or Google listing, you are invisible to a very large share of your potential audience. Studies consistently show that over 80% of local purchasing decisions begin with an online search, and a business that cannot be found online is effectively leaving that revenue on the table for competitors who can.`,
      p2: `We specialize in building fast, professional websites for local businesses — clean design, fully mobile-optimised, and easy for your team to manage without any technical knowledge. We also handle complete SEO setup and Google Business Profile optimisation so that when customers in ${lead.city ?? "your area"} search for ${lead.category ?? "your service"}, ${lead.name} appears at the top of the results. Our onboarding process is straightforward and our solutions are priced to make clear business sense from day one.`,
      p3: `Beyond the initial launch, we provide ongoing support to keep your site fast, secure, and ranking well. We set up performance monitoring, review your Google Analytics monthly, and flag any technical issues before they affect your visibility. Many of our clients see a measurable increase in foot traffic and enquiries within the first 60 days — not because we use tricks, but because we build correctly from the ground up with search intent and user experience as the priority.`,
      p4: `We also integrate booking or contact systems where relevant, so potential customers who find you online can immediately take action — whether that is booking an appointment, requesting a quote, or simply getting your phone number in one tap from their phone. The entire customer acquisition loop, from discovery to first contact, happens automatically and around the clock — even when your team is not working.`,
    },
    health: {
      subject: `Digital Growth for Health & Wellness — ${lead.name} | LevelCoding`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} represents a wonderful opportunity to connect with more clients through a stronger digital presence. For a ${lead.category ?? "wellness"} business${site ? ` like ${site}` : ""}, the online experience — from discovering your studio to booking a session to receiving a reminder the morning of — is often the first and most lasting impression a new client has of your brand. In the wellness industry, trust and professionalism are everything, and your digital presence must reflect the quality of the experience you deliver in person.`,
      p2: `We help health and wellness businesses build seamless online booking systems, beautifully designed mobile experiences, and automated client communication flows that dramatically reduce no-shows and keep your community engaged between visits. Our booking platforms integrate directly with your calendar, send automated reminders via email and SMS, and allow clients to reschedule without creating administrative overhead for your team. The result is fewer missed appointments, a fuller schedule, and a more professional client experience from the very first interaction.`,
      p3: `We also build membership and loyalty systems specifically designed for wellness studios — recurring billing, class pass management, drop-in tracking, and personalised check-in flows that make your regulars feel known and valued. These systems are designed to convert one-time visitors into committed members, which is the single most effective way to grow predictable monthly revenue in the health and wellness space.`,
      p4: `Our platforms are built to feel as calm, elegant, and intentional as the services you offer — clean design, fast load times, and a user experience that requires no instruction manual. At the same time, they work hard behind the scenes: tracking retention rates, identifying clients at risk of churning, and giving you the data you need to make smart decisions about your schedule, pricing, and promotions.`,
    },
    b2b: {
      subject: `Technical Partnership Opportunity — ${lead.name} | LevelCoding`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} is exactly the kind of established B2B firm that we most enjoy working with. For a ${lead.category ?? "professional services"} company${site ? ` like ${site}` : ""}, having robust and scalable internal tools alongside a polished client-facing digital presence is not a luxury — it is a direct competitive advantage that compounds over time. The firms that invest in their technical infrastructure today are the ones that can take on more clients, deliver faster, and operate at higher margins five years from now.`,
      p2: `We provide end-to-end technical solutions for B2B companies: custom internal dashboards, client portals, CRM integrations, API connections between existing tools, and full workflow automation. We have built systems that eliminate hundreds of hours of manual data entry per month, replaced fragile spreadsheet-based reporting with real-time dashboards, and connected previously siloed platforms into a single coherent operational picture. As a European engineering partner based in Romania, we offer the technical depth and delivery speed of a senior team at a cost structure that makes very clear commercial sense.`,
      p3: `One of the areas where we most frequently deliver transformational impact for B2B clients is in client-facing portals and reporting tools. When your clients can log in to see the status of their projects, download their reports, or access their historical data without contacting your team — you save hours of account management time per week and simultaneously deliver a more premium experience. We design and build these portals to match your brand precisely and integrate with the tools your team already uses.`,
      p4: `We also bring deep experience in secure data handling, GDPR-compliant architecture, and building systems that scale as your firm grows — so you are never in a position where your tools become a bottleneck. Our clients typically engage us for an initial project and then continue as a retained technical partner, because having a dedicated engineering team on call is genuinely more cost-effective than hiring full-time senior developers in Western European markets.`,
    },
    tourism: {
      subject: `More Bookings, Higher Revenue — Digital Solutions for ${lead.name}`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} represents exactly the kind of travel and hospitality business that can grow dramatically through smarter digital infrastructure. For a tourism business${site ? ` like ${site}` : ""}, the booking journey — from the very first Google search through to the confirmation email and pre-arrival communication — must be fast, trustworthy, and beautifully designed. In an industry where the customer is comparing you to five alternatives on the same screen, the quality of your digital experience is often what tips the decision in your favour.`,
      p2: `We specialize in building high-converting booking platforms, multilingual travel websites, and automated guest communication systems for hotels, tour operators, B&Bs, and hospitality brands across Europe. Our platforms are built specifically to reduce the gap between visitors landing on your website and completing a booking — through optimised user flows, trust-building design elements, and frictionless payment integration. Our clients typically see a meaningful increase in direct bookings within the first quarter after launch, reducing their dependency on OTA platforms and the commissions that come with them.`,
      p3: `We also build pre-arrival and post-stay communication sequences that run automatically — welcome emails with local tips, day-before reminders, check-in instructions, post-stay review requests, and seasonal re-engagement campaigns for past guests. These flows turn a single stay into a long-term relationship, and a satisfied guest into a source of referrals and repeat bookings. When this is set up correctly, a significant portion of your future revenue comes from people who have already stayed with you — which is the most cost-effective marketing channel available.`,
      p4: `For properties targeting international guests, we also handle full multilingual implementation — ensuring that visitors from Germany, the Netherlands, Switzerland, or Scandinavia see your website in their language, with culturally appropriate messaging and localised trust signals. Combined with technical SEO optimisation for international search, this opens up audience segments that many tourism businesses in ${lead.country ?? "your region"} are currently not capturing at all.`,
    },
  };

  const d = domainIntros[lead.domain] ?? domainIntros.crm;

  const subject = d.subject;
  const body = `Dear ${lead.name} Team,

Hello,

My name is Marian Pirvan and I represent LevelCoding, a European IT-services firm based in Romania. We specialize in high-performance web development, mobile solutions, CRM systems, and platform integrations for businesses across Europe. We work with clients ranging from independent local businesses to established regional brands, and our focus is always the same: deliver measurable results through clean, reliable technology.

${d.p1}

${d.p2}

${d.p3}

${d.p4}

As a European partner, we combine the technical depth of a senior engineering team with the agility and cost efficiency that Western European agencies rarely offer. All of our work is built to last — documented, tested, and handed over with full transparency so your team is never dependent on us to make changes. We work in long-term partnerships because we believe the best results come from understanding a business deeply over time, not from one-off project engagements.

I would love to schedule a brief 15-minute introductory call to learn more about ${lead.name}'s current setup and share a few specific ideas we have already been thinking about for a business in your category. There is no commitment involved — just a conversation to see if there is a genuine fit.

You can view our work and book a time that suits you directly here: https://consulting.levelcoding.com/book/3

Thank you for your time, and I look forward to hearing from you.

Best regards,

Marian Pirvan
LevelCoding
Phone: +40 746 628 424
Email: marian@outreach.levelcoding.com
LinkedIn: marian-pirvan-a182ab95`;

  return { subject, body };
}

export function buildReportSection(report: LeadReport): string {
  const hr = "─────────────────────────────────";
  const L: string[] = [];
  L.push("", hr, "FULL WEBSITE REPORT", hr);

  L.push("⚡ PAGE SPEED");
  if (report.loadTimeMs != null) {
    const s = (report.loadTimeMs / 1000).toFixed(1);
    L.push(`  Load time: ${s}s${report.loadTimeMs > 3000 ? " ⚠ SLOW (>3s)" : " ✓"}`);
    if (report.loadTimeMs > 3000)
      L.push(`  → Your homepage takes ${s}s to load. Google penalises anything over 3s — 53% of mobile visitors leave before it finishes.`);
  } else { L.push("  Not measured"); }

  L.push("", "🔐 SSL CERTIFICATE");
  if (report.sslValid != null) {
    L.push(`  ${report.sslValid ? "✓ Valid" : "✗ INVALID/EXPIRED"}${report.sslExpiryDays != null ? `  ·  expires in ${report.sslExpiryDays} days` : ""}${report.sslIssuer ? `  ·  ${report.sslIssuer}` : ""}`);
    if (report.sslExpiryDays != null && report.sslExpiryDays < 30)
      L.push(`  → Expires in ${report.sslExpiryDays} days — every browser blocks visitors with a full-screen red warning when it lapses.`);
  } else { L.push("  Could not check"); }

  L.push("", "📱 MOBILE");
  if (report.hasViewport != null) {
    L.push(`  ${report.hasViewport ? "✓" : "✗"} Viewport meta tag  ·  ${report.hasTouchIcon ? "✓" : "✗"} Touch icon`);
    if (!report.hasViewport)
      L.push("  → No mobile viewport tag — 60%+ of local searches happen on phones and your layout breaks on all of them.");
  } else { L.push("  Could not check"); }

  L.push("", "🔗 BROKEN LINKS");
  if (report.brokenLinks != null) {
    L.push(`  ${report.brokenLinks} broken / ${report.totalLinks ?? 0} checked`);
    if (report.brokenLinks > 0) {
      const urls: string[] = JSON.parse(report.brokenUrls ?? "[]");
      urls.slice(0, 3).forEach(u => L.push(`  ✗ ${u}`));
      L.push(`  → ${report.brokenLinks} broken link(s) — visitors and Google bots hit dead ends, hurting your ranking.`);
    }
  } else { L.push("  Could not check"); }

  L.push("", "📣 SOCIAL MEDIA");
  const found = [report.hasFacebook && "Facebook", report.hasInstagram && "Instagram", report.hasLinkedIn && "LinkedIn", report.hasTiktok && "TikTok", report.hasYoutube && "YouTube", report.hasTwitter && "X/Twitter"].filter(Boolean);
  const missing = [!report.hasFacebook && "Facebook", !report.hasInstagram && "Instagram", !report.hasLinkedIn && "LinkedIn", !report.hasTiktok && "TikTok", !report.hasYoutube && "YouTube", !report.hasTwitter && "X/Twitter"].filter(Boolean);
  if (found.length)   L.push(`  Found  : ${found.join(", ")}`);
  if (missing.length) L.push(`  Missing: ${missing.join(", ")}`);
  if (found.length === 0) L.push("  → No social media found — competitors retarget your visitors while you have no presence to retarget from.");

  L.push("", "📧 EMAIL DELIVERABILITY");
  if (report.hasSPF != null) {
    L.push(`  SPF: ${report.hasSPF ? "✓" : "✗ MISSING"}  ·  DKIM: ${report.hasDKIM ? "✓" : "✗ MISSING"}  ·  DMARC: ${report.hasDMARC ? `✓ (${report.dmarcPolicy})` : "✗ MISSING"}`);
    if (!report.hasDMARC)
      L.push("  → No DMARC — your business emails are statistically likely landing in spam.");
  } else { L.push("  Could not check DNS"); }

  return L.join("\n");
}

export function buildLeadCopyText(lead: Lead, batchDate: string, scan: FullScan | null): string {
  const hr = "─────────────────────────────────";
  const lines: string[] = [];

  lines.push(`${lead.name}  ·  ${DOMAIN_LABEL[lead.domain] ?? lead.domain}`);
  if (lead.category) lines.push(`Category : ${lead.category}`);
  const loc = [lead.city, lead.country].filter(Boolean).join(", ");
  if (loc)          lines.push(`Location : ${loc}`);
  if (lead.phone)   lines.push(`Phone    : ${lead.phone}`);
  if (lead.website) lines.push(`Website  : ${lead.website}`);
  if (lead.rating)  lines.push(`Rating   : ${lead.rating} ★`);
  lines.push(`Scheduled: ${fmtDate(batchDate)}`);
  if (lead.emailLogs.length > 0) {
    const last = lead.emailLogs[0];
    lines.push(`Emails   : ${lead.emailLogs.length} sent  (last: ${last.status} · ${fmtDate(last.sentAt)})`);
  } else {
    lines.push(`Emails   : none yet`);
  }

  if (!scan) return lines.join("\n");

  lines.push("", hr, "LIGHTHOUSE AUDIT", hr);

  function scoreLabel(s: number) { return s >= 70 ? "GOOD" : s >= 40 ? "WEAK" : "CRITICAL"; }
  function ck(ok: boolean, label: string) { return `  ${ok ? "✓" : "✗"} ${label}`; }

  lines.push(`🔒 Security   ${scan.secScore}/100  ${scoreLabel(scan.secScore)}`);
  lines.push(ck(scan.https,     "HTTPS (encrypted connection)"));
  lines.push(ck(scan.hsts,      "HSTS header (force HTTPS in browsers)"));
  lines.push(ck(scan.csp,       "Content-Security-Policy (XSS protection)"));
  lines.push(ck(scan.xfo,       "X-Frame-Options (anti-clickjacking)"));
  lines.push(ck(scan.xcto,      "X-Content-Type-Options"));

  lines.push("");
  lines.push(`🔍 SEO   ${scan.seoScore}/100  ${scoreLabel(scan.seoScore)}`);
  lines.push(ck(scan.hasTitle,     "<title> tag"));
  lines.push(ck(scan.hasMeta,      "Meta description (Google snippet)"));
  lines.push(ck(scan.hasH1,        "H1 heading"));
  lines.push(ck(scan.hasCanonical, "Canonical URL (no duplicate-content risk)"));
  lines.push(ck(scan.hasOg,        "Open Graph tags (social sharing preview)"));
  lines.push(ck(scan.hasRobots,    "robots.txt"));
  lines.push(ck(scan.hasSitemap,   "sitemap.xml (full page indexing)"));

  lines.push("");
  lines.push(`📊 Marketing   ${scan.semScore}/100  ${scoreLabel(scan.semScore)}`);
  lines.push(ck(scan.hasGa,        "Google Analytics (traffic data)"));
  lines.push(ck(scan.hasGtm,       "Google Tag Manager"));
  lines.push(ck(scan.hasFbPixel,   "Facebook Pixel (retargeting)"));
  lines.push(ck(scan.hasSchemaOrg, "Schema.org markup (Google rich results)"));
  lines.push(ck(scan.hasLinkedIn,  "LinkedIn Insight Tag"));
  lines.push(ck(scan.hasHotjar,    "Hotjar (user behaviour recording)"));

  const pitches: string[] = [];

  if (!scan.https) {
    pitches.push('🔒 SECURITY HOOK — "Your website currently loads over plain HTTP. Chrome and Firefox show a red "Not Secure" warning to every visitor before they read a single word — this alone kills trust and conversions. An SSL certificate takes under an hour to install."');
  } else if (scan.secScore < 60) {
    pitches.push('🔒 SECURITY HOOK — "Your site uses HTTPS, but is missing critical security headers (CSP, HSTS). A quick security audit would bring it up to enterprise standard and protect against common injection attacks."');
  }

  const seoMissing: string[] = [];
  if (!scan.hasMeta)      seoMissing.push("no meta description (Google generates a random, usually gibberish snippet instead of your pitch)");
  if (!scan.hasSitemap)   seoMissing.push("no sitemap.xml (search crawlers may miss entire sections of your site)");
  if (!scan.hasCanonical) seoMissing.push("no canonical URL (risk of duplicate-content penalty across pages)");
  if (!scan.hasOg)        seoMissing.push("no Open Graph tags (social shares look broken with no image or title)");
  if (seoMissing.length > 0) {
    pitches.push(`🔍 SEO HOOK — "We noticed ${seoMissing.join("; ")}. These are fast wins — we can fix all of them in a single afternoon and submit a clean sitemap to Google Search Console so your pages start ranking within 48 hours."`);
  }

  if (!scan.hasGa && !scan.hasGtm) {
    pitches.push('📊 MARKETING HOOK — "Right now you have zero visibility into your website traffic — no Google Analytics, no tag manager. You don\'t know how many people visit, where they come from, or which pages convert. We can fix this in under an hour and give you a live dashboard you can check every morning."');
  } else if (!scan.hasFbPixel && !scan.hasSchemaOrg) {
    const missing2: string[] = [];
    if (!scan.hasFbPixel)   missing2.push("Facebook Pixel (no retargeting — you\'re paying for ads with no way to follow up)");
    if (!scan.hasSchemaOrg) missing2.push("Schema.org markup (your business doesn\'t show star ratings or rich cards in Google results)");
    pitches.push(`📊 MARKETING HOOK — "Two quick wins available: ${missing2.join("; ")}."`);
  }

  if (pitches.length > 0) {
    lines.push("", hr, "EMAIL PITCH ANGLES", hr);
    lines.push("Use whichever resonates most — paste directly into your email:\n");
    pitches.forEach((p, i) => { lines.push(`${i + 1}. ${p}`); lines.push(""); });
  }

  return lines.join("\n");
}
