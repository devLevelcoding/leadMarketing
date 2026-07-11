import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (compatible; LevelCodingBot/1.0)";

// Extract phone/WA numbers from raw HTML
function extractNumbers(html: string): string[] {
  const found = new Set<string>();

  // wa.me links → most reliable
  for (const m of html.matchAll(/wa\.me\/(\+?[\d]{7,15})/g)) {
    found.add("+" + m[1].replace(/\D/g, ""));
  }
  // tel: links
  for (const m of html.matchAll(/href=["']tel:(\+?[\d\s\-().]{7,20})["']/g)) {
    const clean = m[1].replace(/[\s\-().]/g, "");
    if (clean.length >= 7) found.add(clean.startsWith("+") ? clean : "+" + clean);
  }
  // WhatsApp icon/text followed by a number
  for (const m of html.matchAll(/whatsapp[^+\d]{0,30}(\+[\d\s\-]{8,18})/gi)) {
    found.add(m[1].replace(/[\s\-]/g, ""));
  }

  return Array.from(found).slice(0, 5);
}

export async function GET(req: NextRequest) {
  const website = req.nextUrl.searchParams.get("website");
  if (!website) return NextResponse.json({ error: "website required" }, { status: 400 });

  // Normalise URL
  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ numbers: [], note: `HTTP ${res.status}` });

    const html = await res.text();
    const numbers = extractNumbers(html);

    // If nothing found on homepage, try /contact
    if (numbers.length === 0) {
      try {
        const base = new URL(url).origin;
        const cr = await fetch(`${base}/contact`, {
          headers: { "User-Agent": UA, "Accept": "text/html" },
          signal: AbortSignal.timeout(5000),
        });
        if (cr.ok) {
          const ch = await cr.text();
          numbers.push(...extractNumbers(ch));
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ numbers: [...new Set(numbers)].slice(0, 5) });
  } catch (e) {
    return NextResponse.json({ numbers: [], error: String(e) });
  }
}
