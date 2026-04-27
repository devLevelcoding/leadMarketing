export type ScanResult = {
  leadId: number;
  leadName: string;
  url: string;
  // security
  https: boolean;
  hsts: boolean;
  xfo: boolean;
  csp: boolean;
  xcto: boolean;
  xssHeader: boolean;
  secScore: number;
  // seo
  hasTitle: boolean;
  hasMeta: boolean;
  hasH1: boolean;
  hasCanonical: boolean;
  hasOg: boolean;
  hasRobots: boolean;
  hasSitemap: boolean;
  seoScore: number;
  // sem
  hasGa: boolean;
  hasGtm: boolean;
  hasFbPixel: boolean;
  hasLinkedIn: boolean;
  hasSchemaOrg: boolean;
  hasHotjar: boolean;
  semScore: number;
  // meta
  statusCode: number | null;
  error: string | null;
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT = 10_000;

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function securityScore(r: Omit<ScanResult, "secScore" | "seoScore" | "semScore">): number {
  let s = 0;
  if (r.https)     s += 30;
  if (r.hsts)      s += 15;
  if (r.xfo)       s += 15;
  if (r.csp)       s += 20;
  if (r.xcto)      s += 10;
  if (r.xssHeader) s += 10;
  return s;
}

function seoScore(r: Omit<ScanResult, "secScore" | "seoScore" | "semScore">): number {
  let s = 0;
  if (r.hasTitle)     s += 20;
  if (r.hasMeta)      s += 20;
  if (r.hasH1)        s += 15;
  if (r.hasCanonical) s += 10;
  if (r.hasOg)        s += 10;
  if (r.hasRobots)    s += 15;
  if (r.hasSitemap)   s += 10;
  return s;
}

function semScore(r: Omit<ScanResult, "secScore" | "seoScore" | "semScore">): number {
  let s = 0;
  if (r.hasGa)        s += 30;
  if (r.hasGtm)       s += 20;
  if (r.hasFbPixel)   s += 15;
  if (r.hasSchemaOrg) s += 15;
  if (r.hasLinkedIn)  s += 10;
  if (r.hasHotjar)    s += 10;
  return s;
}

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkResource(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, 5_000);
    return res.ok;
  } catch {
    return false;
  }
}

export async function scanWebsite(
  leadId: number,
  leadName: string,
  rawUrl: string
): Promise<ScanResult> {
  const url = normalizeUrl(rawUrl);
  const base: ScanResult = {
    leadId, leadName, url,
    https: url.startsWith("https://"),
    hsts: false, xfo: false, csp: false, xcto: false, xssHeader: false, secScore: 0,
    hasTitle: false, hasMeta: false, hasH1: false, hasCanonical: false,
    hasOg: false, hasRobots: false, hasSitemap: false, seoScore: 0,
    hasGa: false, hasGtm: false, hasFbPixel: false, hasLinkedIn: false,
    hasSchemaOrg: false, hasHotjar: false, semScore: 0,
    statusCode: null, error: null,
  };

  let html = "";
  let finalOrigin = url;

  try {
    const res = await fetchWithTimeout(url, TIMEOUT);
    base.statusCode = res.status;

    // Security headers
    const h = res.headers;
    base.hsts  = h.has("strict-transport-security");
    base.xfo   = h.has("x-frame-options");
    base.csp   = h.has("content-security-policy");
    base.xcto  = h.has("x-content-type-options");
    base.xssHeader = h.has("x-xss-protection");

    // If redirected to HTTP, mark https false
    const finalUrl = res.url || url;
    if (finalUrl.startsWith("http://")) base.https = false;
    try { finalOrigin = new URL(finalUrl).origin; } catch { finalOrigin = url; }

    const ct = h.get("content-type") || "";
    if (ct.includes("text/html")) {
      html = await res.text();
    }
  } catch (err: unknown) {
    base.error = err instanceof Error ? err.message : String(err);
    base.secScore = securityScore(base);
    base.seoScore = seoScore(base);
    base.semScore = semScore(base);
    return base;
  }

  if (html) {
    const lc = html.toLowerCase();

    // SEO signals
    base.hasTitle     = /<title[^>]*>[^<]{1,}/i.test(html);
    base.hasMeta      = /<meta[^>]+name=["']description["']/i.test(html);
    base.hasH1        = /<h1[\s>]/i.test(html);
    base.hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
    base.hasOg        = /<meta[^>]+property=["']og:/i.test(html) || /<meta[^>]+name=["']og:/i.test(html);

    // SEM signals
    base.hasGa      = lc.includes("google-analytics.com") || lc.includes("gtag(") || lc.includes("ga(") || /G-[A-Z0-9]{6,}/i.test(html) || /UA-\d{6,}/i.test(html);
    base.hasGtm     = lc.includes("googletagmanager.com/gtm.js") || lc.includes("gtm.js");
    base.hasFbPixel = lc.includes("connect.facebook.net") || lc.includes("fbq(") || lc.includes("facebook-pixel");
    base.hasLinkedIn = lc.includes("_linkedin_partner_id") || lc.includes("snap.licdn.com") || lc.includes("linkedin.com/li_tag");
    base.hasSchemaOrg = lc.includes("application/ld+json") || lc.includes("schema.org") || lc.includes("itemscope");
    base.hasHotjar  = lc.includes("hotjar.com") || lc.includes("hj(") || lc.includes("_hjSettings");
  }

  // Robots + sitemap (parallel, quick check)
  try {
    const [robots, sitemap] = await Promise.all([
      checkResource(`${finalOrigin}/robots.txt`),
      checkResource(`${finalOrigin}/sitemap.xml`),
    ]);
    base.hasRobots  = robots;
    base.hasSitemap = sitemap;
  } catch {
    // leave false
  }

  base.secScore = securityScore(base);
  base.seoScore = seoScore(base);
  base.semScore = semScore(base);
  return base;
}

// Run tasks with limited concurrency
export async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onDone: (result: T, index: number) => void
): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      const result = await tasks[idx]();
      onDone(result, idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
}
