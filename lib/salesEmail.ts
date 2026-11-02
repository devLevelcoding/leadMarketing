// Long "sales" email for AI Leads: the agent's analysis plus the Lighthouse scan of the
// lead's website (lib/scanner.ts), turned into numbers and business consequences.
// Plain text, no LLM: every claim comes from the scan or the agent's analysis.

export type SiteScan = {
  url: string;
  https: boolean; hsts: boolean; xfo: boolean; csp: boolean; xcto: boolean; xssHeader: boolean;
  secScore: number;
  hasTitle: boolean; hasMeta: boolean; hasH1: boolean; hasCanonical: boolean; hasOg: boolean;
  hasRobots: boolean; hasSitemap: boolean; seoScore: number;
  hasGa: boolean; hasGtm: boolean; hasFbPixel: boolean; hasLinkedIn: boolean;
  hasSchemaOrg: boolean; hasHotjar: boolean; semScore: number;
  statusCode: number | null; error: string | null;
};

export type SalesLead = {
  name: string; website: string | null; reviews: number | null; rating: number | null;
  pain_points: string[]; needs: string[]; subject: string;
};

const BOOKING = "https://consulting.levelcoding.com/book/3";

const SIGNATURE = `Best regards,

Marian Pirvan
LevelCoding
Phone: +40 746 628 424
Email: marian@outreach.levelcoding.com
Book a call: ${BOOKING}`;

/** "Soul Senses Spa - Downtown, Abu Dhabi" -> "Soul Senses Spa" */
export function shortName(name: string) {
  return name.split(/\s+[-–|·]\s+|\s*\(/)[0].trim() || name;
}

export function siteDomain(website: string | null): string | null {
  const first = (website || "").split(";")[0].trim();
  if (!first) return null;
  try {
    return new URL(/^https?:\/\//i.test(first) ? first : `https://${first}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The scan's findings, most damaging first, each with what it costs the business. */
export function findings(s: SiteScan, l: SalesLead): string[] {
  const out: string[] = [];
  const missingSec = [
    !s.hsts && "HSTS", !s.csp && "Content-Security-Policy", !s.xfo && "X-Frame-Options",
    !s.xcto && "X-Content-Type-Options",
  ].filter(Boolean) as string[];

  if (!s.https) {
    out.push("The site is not served over HTTPS, so Chrome and Safari show \"Not secure\" next to your address. Many visitors leave at that point, and Google ranks secure sites higher.");
  }
  if (!s.hasGa && !s.hasGtm) {
    out.push("There is no analytics (no Google Analytics or Tag Manager). You can't see how many people visit, which pages they read, or where they drop off before contacting you.");
  }
  if (!s.hasSchemaOrg) {
    out.push(l.reviews && l.reviews >= 10
      ? `There is no structured data (schema.org). Your ${l.reviews.toLocaleString("en-US")} Google reviews${l.rating ? ` (${l.rating}★)` : ""} could show as stars, prices and opening hours directly in Google results, which makes your listing stand out against competitors.`
      : "There is no structured data (schema.org), so Google can't show stars, prices or opening hours next to your listing.");
  }
  if (!s.hasMeta) {
    out.push("The homepage has no meta description, so Google writes its own snippet from random text on the page. A clear one with your offer and location gets more clicks from the same ranking.");
  }
  if (!s.hasSitemap || !s.hasRobots) {
    const what = [!s.hasSitemap && "sitemap.xml", !s.hasRobots && "robots.txt"].filter(Boolean).join(" and ");
    out.push(`No ${what} was found, so Google discovers new pages and offers slowly, or not at all.`);
  }
  if (!s.hasFbPixel) {
    out.push("There is no Meta (Facebook/Instagram) pixel. People who visit and don't book can't be shown an ad again, and that retargeting is usually the cheapest way to win them back.");
  }
  if (!s.hasOg) {
    out.push("No Open Graph tags: when someone shares your link on WhatsApp, Facebook or LinkedIn it appears without a proper image and title.");
  }
  if (missingSec.length >= 2) {
    out.push(`${missingSec.length} standard security headers are missing (${missingSec.join(", ")}). They protect visitors against clickjacking and injected content, and they take about a day to set up correctly.`);
  }
  if (!s.hasH1 || !s.hasTitle) {
    out.push(`The homepage has no ${[!s.hasTitle && "<title>", !s.hasH1 && "main heading (H1)"].filter(Boolean).join(" or ")}, which is one of the first things Google reads to understand what you offer.`);
  }
  return out;
}

/** "Security 47/100 · SEO 71/100 · Marketing tracking 37/100" */
export function scoreLine(s: SiteScan) {
  return `Security ${s.secScore}/100 · SEO basics ${s.seoScore}/100 · Marketing tracking ${s.semScore}/100`;
}

export function buildSalesEmail(l: SalesLead, scan: SiteScan | null): { subject: string; body: string } {
  const name = shortName(l.name);
  const domain = siteDomain(l.website) ?? "your website";
  const usable = scan && !scan.error;
  const found = usable ? findings(scan, l).slice(0, 4) : [];

  const subject = usable
    ? `${name}: a quick audit of ${domain} (security ${scan.secScore}/100, SEO ${scan.seoScore}/100)`
    : l.subject;

  const P: string[] = [];
  P.push(`Hello ${name} team,`);

  if (l.reviews && l.reviews >= 20) {
    P.push(`${l.reviews.toLocaleString("en-US")} Google reviews${l.rating ? ` at ${l.rating}★` : ""} show your customers clearly like what you do. Your website should bring in new ones just as well, and right now some easy wins are being missed.`);
  } else {
    P.push(`I came across ${name} while looking at businesses in your area, and I think your website could bring you noticeably more enquiries with a few targeted fixes.`);
  }

  P.push(`My name is Marian Pirvan, and I run LevelCoding, a web and app development studio in the EU (Romania). Before writing to you, I ran an automated check of ${domain}.`);

  if (usable) {
    P.push(`The results:\n\n  ${scoreLine(scan).split(" · ").join("\n  ")}`);
    if (found.length) {
      P.push(`What this means for ${name}:\n\n${found.map((f, i) => `${i + 1}. ${f}`).join("\n\n")}`);
    }
  }

  const extra = l.pain_points.filter(p => p.trim()).slice(0, usable ? 2 : 4);
  if (extra.length) {
    P.push(`${usable ? "I also noticed" : "What I noticed"}:\n\n${extra.map(p => `  • ${p}`).join("\n")}`);
  }

  const offer = [
    ...(usable && found.length ? ["Fix every issue above, with a before/after report so you can see the change"] : []),
    ...l.needs.filter(n => n.trim()).slice(0, 3),
  ];
  if (offer.length) {
    P.push(`What we would do:\n\n${offer.map(o => `  • ${o}`).join("\n")}\n\nMost of this is done in 1–2 weeks at a fixed price agreed upfront, so there are no surprises. The work is documented and handed over, so you're never locked in with us.`);
  }

  P.push(usable
    ? `I can send you the full report for ${domain} for free, with no strings attached. Just reply "report". Or, if it's easier, book a 15-minute call and I'll walk you through it: ${BOOKING}`
    : `Would you be open to a free 15-minute call? I'll share a few specific ideas for ${name}, with no commitment: ${BOOKING}`);

  P.push(SIGNATURE);
  return { subject, body: P.join("\n\n") };
}
