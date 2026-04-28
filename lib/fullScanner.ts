import * as tls from "tls";
import * as dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);

export interface FullScanResult {
  leadId: number;
  // Page Speed
  loadTimeMs: number | null;
  // SSL
  sslValid: boolean | null;
  sslExpiryDays: number | null;
  sslIssuer: string | null;
  // Mobile
  hasViewport: boolean | null;
  hasTouchIcon: boolean | null;
  // Broken links
  totalLinks: number | null;
  brokenLinks: number | null;
  brokenUrls: string[];
  // Social presence
  hasFacebook: boolean | null;
  hasInstagram: boolean | null;
  hasLinkedIn: boolean | null;
  hasTiktok: boolean | null;
  hasYoutube: boolean | null;
  hasTwitter: boolean | null;
  // Email deliverability
  hasSPF: boolean | null;
  hasDKIM: boolean | null;
  hasDMARC: boolean | null;
  spfValue: string | null;
  dmarcPolicy: string | null;

  error: string | null;
}

function normaliseUrl(raw: string): string {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function checkPageSpeed(url: string): Promise<{ loadTimeMs: number | null }> {
  try {
    const start = Date.now();
    await fetchWithTimeout(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadBot/1.0)" },
    }, 15000);
    return { loadTimeMs: Date.now() - start };
  } catch {
    return { loadTimeMs: null };
  }
}

async function checkSSL(hostname: string): Promise<{
  sslValid: boolean | null;
  sslExpiryDays: number | null;
  sslIssuer: string | null;
}> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ sslValid: null, sslExpiryDays: null, sslIssuer: null }), 8000);
    try {
      const socket = tls.connect({ host: hostname, port: 443, rejectUnauthorized: false, servername: hostname }, () => {
        clearTimeout(timeout);
        try {
          const cert = socket.getPeerCertificate();
          socket.destroy();
          if (!cert || !cert.valid_to) {
            return resolve({ sslValid: false, sslExpiryDays: null, sslIssuer: null });
          }
          const expiryDate = new Date(cert.valid_to);
          const daysLeft = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);
          const rawIssuer = cert.issuer?.O ?? cert.issuer?.CN ?? null;
          const issuer = Array.isArray(rawIssuer) ? rawIssuer[0] ?? null : rawIssuer;
          resolve({ sslValid: daysLeft > 0, sslExpiryDays: daysLeft, sslIssuer: issuer });
        } catch {
          socket.destroy();
          resolve({ sslValid: null, sslExpiryDays: null, sslIssuer: null });
        }
      });
      socket.on("error", () => {
        clearTimeout(timeout);
        resolve({ sslValid: false, sslExpiryDays: null, sslIssuer: null });
      });
    } catch {
      clearTimeout(timeout);
      resolve({ sslValid: null, sslExpiryDays: null, sslIssuer: null });
    }
  });
}

async function checkMobileAndSocial(html: string): Promise<{
  hasViewport: boolean;
  hasTouchIcon: boolean;
  hasFacebook: boolean;
  hasInstagram: boolean;
  hasLinkedIn: boolean;
  hasTiktok: boolean;
  hasYoutube: boolean;
  hasTwitter: boolean;
}> {
  const lc = html.toLowerCase();
  return {
    hasViewport:   /<meta[^>]+name=["']viewport["']/i.test(html),
    hasTouchIcon:  /apple-touch-icon/i.test(html),
    hasFacebook:   /facebook\.com\//i.test(html),
    hasInstagram:  /instagram\.com\//i.test(html),
    hasLinkedIn:   /linkedin\.com\//i.test(html),
    hasTiktok:     /tiktok\.com\//i.test(html),
    hasYoutube:    /youtube\.com\//i.test(html),
    hasTwitter:    /(?:twitter|x)\.com\//i.test(lc),
  };
}

async function checkBrokenLinks(html: string, baseUrl: string): Promise<{
  totalLinks: number;
  brokenLinks: number;
  brokenUrls: string[];
}> {
  const base = new URL(baseUrl);
  const hrefs = Array.from(html.matchAll(/href=["']([^"'#?][^"']*?)["']/gi))
    .map(m => m[1])
    .filter(h => h && !h.startsWith("mailto:") && !h.startsWith("tel:") && !h.startsWith("javascript:"));

  // Resolve to absolute, keep only same-host links, dedupe, limit to 15
  const resolved = Array.from(new Set(
    hrefs.map(h => {
      try {
        const u = new URL(h, base);
        return u.hostname === base.hostname ? u.href : null;
      } catch { return null; }
    }).filter(Boolean) as string[]
  )).slice(0, 15);

  if (resolved.length === 0) return { totalLinks: hrefs.length, brokenLinks: 0, brokenUrls: [] };

  const broken: string[] = [];
  await Promise.all(resolved.map(async (url) => {
    try {
      const r = await fetchWithTimeout(url, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadBot/1.0)" },
        redirect: "follow",
      }, 8000);
      if (r.status === 404 || r.status === 410) broken.push(url);
    } catch {
      broken.push(url);
    }
  }));

  return { totalLinks: hrefs.length, brokenLinks: broken.length, brokenUrls: broken };
}

async function checkEmailDeliverability(domain: string): Promise<{
  hasSPF: boolean;
  hasDKIM: boolean;
  hasDMARC: boolean;
  spfValue: string | null;
  dmarcPolicy: string | null;
}> {
  let hasSPF = false, spfValue: string | null = null;
  let hasDKIM = false;
  let hasDMARC = false, dmarcPolicy: string | null = null;

  try {
    const spfRecords = await resolveTxt(domain).catch(() => [] as string[][]);
    for (const record of spfRecords) {
      const flat = record.join("");
      if (flat.startsWith("v=spf1")) { hasSPF = true; spfValue = flat; break; }
    }
  } catch {}

  const dkimSelectors = ["default", "google", "mail", "dkim", "k1", "selector1", "selector2"];
  for (const selector of dkimSelectors) {
    try {
      const records = await resolveTxt(`${selector}._domainkey.${domain}`).catch(() => [] as string[][]);
      if (records.length > 0 && records.some(r => r.join("").includes("v=DKIM1"))) {
        hasDKIM = true;
        break;
      }
    } catch {}
  }

  try {
    const dmarcRecords = await resolveTxt(`_dmarc.${domain}`).catch(() => [] as string[][]);
    for (const record of dmarcRecords) {
      const flat = record.join("");
      if (flat.startsWith("v=DMARC1")) {
        hasDMARC = true;
        const pMatch = flat.match(/p=(\w+)/);
        dmarcPolicy = pMatch ? pMatch[1] : "none";
        break;
      }
    }
  } catch {}

  return { hasSPF, hasDKIM, hasDMARC, spfValue, dmarcPolicy };
}

export async function runFullScan(leadId: number, websiteRaw: string): Promise<FullScanResult> {
  const url = normaliseUrl(websiteRaw);
  const hostname = extractHostname(url);
  const domain = hostname.replace(/^www\./, "");

  const empty: FullScanResult = {
    leadId,
    loadTimeMs: null,
    sslValid: null, sslExpiryDays: null, sslIssuer: null,
    hasViewport: null, hasTouchIcon: null,
    totalLinks: null, brokenLinks: null, brokenUrls: [],
    hasFacebook: null, hasInstagram: null, hasLinkedIn: null,
    hasTiktok: null, hasYoutube: null, hasTwitter: null,
    hasSPF: null, hasDKIM: null, hasDMARC: null,
    spfValue: null, dmarcPolicy: null,
    error: null,
  };

  try {
    // Fetch HTML + measure load time in parallel with SSL + DNS
    const [htmlRes, sslResult, emailResult] = await Promise.all([
      (async () => {
        const start = Date.now();
        try {
          const r = await fetchWithTimeout(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadBot/1.0)" },
          }, 15000);
          const text = await r.text();
          return { html: text, loadTimeMs: Date.now() - start };
        } catch {
          return { html: "", loadTimeMs: null };
        }
      })(),
      checkSSL(hostname),
      checkEmailDeliverability(domain),
    ]);

    const { html, loadTimeMs } = htmlRes;
    const mobileAndSocial = html ? await checkMobileAndSocial(html) : null;
    const linkResult = html ? await checkBrokenLinks(html, url) : null;

    return {
      leadId,
      loadTimeMs,
      ...sslResult,
      hasViewport:   mobileAndSocial?.hasViewport ?? null,
      hasTouchIcon:  mobileAndSocial?.hasTouchIcon ?? null,
      totalLinks:    linkResult?.totalLinks ?? null,
      brokenLinks:   linkResult?.brokenLinks ?? null,
      brokenUrls:    linkResult?.brokenUrls ?? [],
      hasFacebook:   mobileAndSocial?.hasFacebook ?? null,
      hasInstagram:  mobileAndSocial?.hasInstagram ?? null,
      hasLinkedIn:   mobileAndSocial?.hasLinkedIn ?? null,
      hasTiktok:     mobileAndSocial?.hasTiktok ?? null,
      hasYoutube:    mobileAndSocial?.hasYoutube ?? null,
      hasTwitter:    mobileAndSocial?.hasTwitter ?? null,
      ...emailResult,
      error: null,
    };
  } catch (err) {
    return { ...empty, error: String(err) };
  }
}
