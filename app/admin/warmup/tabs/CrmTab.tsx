"use client";
import { useEffect, useState, useCallback } from "react";

interface ScanData {
  https: boolean; hsts: boolean; xfo: boolean; csp: boolean; xcto: boolean;
  hasTitle: boolean; hasMeta: boolean; hasH1: boolean; hasCanonical: boolean;
  hasOg: boolean; hasRobots: boolean; hasSitemap: boolean;
  hasGa: boolean; hasGtm: boolean; hasFbPixel: boolean; hasLinkedIn: boolean;
  hasSchemaOrg: boolean; hasHotjar: boolean;
  secScore: number; seoScore: number; semScore: number; error: string | null;
}

interface CrmLead {
  id: number; name: string; country_iso: string; industry: string;
  tier: string; city: string; phone: string; website: string;
  linkedin_url: string; google_maps_url: string; status: string;
  scan_sec: number | null; scan_seo: number | null; scan_sem: number | null;
  scan_json: string | null;
}
interface CrmResponse {
  leads: CrmLead[]; total: number; page: number; pages: number; pageSize: number;
  tierCounts: Record<string, number>; countryCounts: Record<string, number>;
}

const INDUSTRIES = ["Real Estate", "Construction", "IT & Software", "Logistics & Transport"];

const INDUSTRY_BADGE: Record<string, { icon: string; cls: string }> = {
  "Real Estate":           { icon: "🏠", cls: "bg-orange-100 text-orange-800" },
  "Construction":          { icon: "🏗️", cls: "bg-yellow-100 text-yellow-800" },
  "IT & Software":         { icon: "💻", cls: "bg-blue-100 text-blue-800"    },
  "Logistics & Transport": { icon: "🚚", cls: "bg-green-100 text-green-800"  },
};

const FLAG: Record<string, string> = { IT: "🇮🇹", PL: "🇵🇱", NL: "🇳🇱" };

function CopyBtn({ text, label, variant = "green" }: { text: string; label: string; variant?: "green" | "purple" }) {
  const [copied, setCopied] = useState(false);
  const cls = variant === "purple"
    ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
    : "bg-green-100 text-green-700 hover:bg-green-200";
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`text-xs px-2.5 py-1 rounded transition font-medium ${cls}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function scoreLabel(s: number) { return s >= 70 ? "GOOD" : s >= 40 ? "WEAK" : "CRITICAL"; }
function ck(ok: boolean, label: string) { return `  ${ok ? "✓" : "✗"} ${label}`; }

function buildColdCallReport(lead: CrmLead, scan: ScanData): string {
  const hr = "─────────────────────────────────";
  const location = [lead.city, lead.country_iso].filter(Boolean).join(", ");
  const lines: string[] = [];

  lines.push(`${lead.name}  ·  ${lead.industry}`);
  lines.push(`Category : ${lead.industry}`);
  lines.push(`Location : ${location || "—"}`);
  lines.push(`Phone    : ${lead.phone || "—"}`);
  lines.push(`Website  : ${lead.website || "—"}`);
  if (lead.linkedin_url)    lines.push(`LinkedIn : ${lead.linkedin_url}`);
  if (lead.google_maps_url) lines.push(`Maps     : ${lead.google_maps_url}`);
  lines.push(`Emails   : none yet`);
  lines.push(``, hr, `WEBSITE AUDIT`, hr);
  lines.push(`🔒 Security   ${scan.secScore}/100  ${scoreLabel(scan.secScore)}`);
  lines.push(ck(scan.https, "HTTPS"));
  lines.push(ck(scan.hsts,  "HSTS header"));
  lines.push(ck(scan.csp,   "Content-Security-Policy"));
  lines.push(ck(scan.xfo,   "X-Frame-Options"));
  lines.push(ck(scan.xcto,  "X-Content-Type-Options"));
  lines.push(``);
  lines.push(`🔍 SEO   ${scan.seoScore}/100  ${scoreLabel(scan.seoScore)}`);
  lines.push(ck(scan.hasTitle,     "<title> tag"));
  lines.push(ck(scan.hasMeta,      "Meta description"));
  lines.push(ck(scan.hasH1,        "H1 heading"));
  lines.push(ck(scan.hasCanonical, "Canonical URL"));
  lines.push(ck(scan.hasOg,        "Open Graph tags"));
  lines.push(ck(scan.hasRobots,    "robots.txt"));
  lines.push(ck(scan.hasSitemap,   "sitemap.xml"));
  lines.push(``);
  lines.push(`📊 Marketing   ${scan.semScore}/100  ${scoreLabel(scan.semScore)}`);
  lines.push(ck(scan.hasGa,        "Google Analytics"));
  lines.push(ck(scan.hasGtm,       "Google Tag Manager"));
  lines.push(ck(scan.hasFbPixel,   "Facebook Pixel"));
  lines.push(ck(scan.hasSchemaOrg, "Schema.org markup"));
  lines.push(ck(scan.hasLinkedIn,  "LinkedIn Insight Tag"));
  lines.push(ck(scan.hasHotjar,    "Hotjar"));

  const pitches: string[] = [];
  if (!scan.https) {
    pitches.push(`🔒 SECURITY HOOK — "Your website loads over plain HTTP — Chrome shows a red 'Not Secure' warning to every visitor. An SSL certificate takes under an hour to install."`);
  } else if (scan.secScore < 60) {
    pitches.push(`🔒 SECURITY HOOK — "Your site has HTTPS but is missing critical security headers. A quick audit would bring it to enterprise standard."`);
  }
  const seoMissing: string[] = [];
  if (!scan.hasMeta)      seoMissing.push("no meta description");
  if (!scan.hasSitemap)   seoMissing.push("no sitemap.xml");
  if (!scan.hasCanonical) seoMissing.push("no canonical URL");
  if (!scan.hasOg)        seoMissing.push("no Open Graph tags");
  if (seoMissing.length)  pitches.push(`🔍 SEO HOOK — "We noticed ${seoMissing.join("; ")}. These are fast wins we can fix in one afternoon."`);
  if (!scan.hasGa && !scan.hasGtm) {
    pitches.push(`📊 MARKETING HOOK — "You have zero visibility into website traffic — no Analytics, no tag manager. We can fix this in under an hour and give you a live dashboard."`);
  } else if (!scan.hasFbPixel || !scan.hasSchemaOrg) {
    const m: string[] = [];
    if (!scan.hasFbPixel)   m.push("no Facebook Pixel (no retargeting)");
    if (!scan.hasSchemaOrg) m.push("no Schema.org (no rich cards in Google)");
    pitches.push(`📊 MARKETING HOOK — "${m.join("; ")}."`);
  }
  if (pitches.length) {
    lines.push(``, hr, `COLD CALL PITCH ANGLES`, hr);
    pitches.forEach((p, i) => { lines.push(`${i + 1}. ${p}`); lines.push(""); });
  }
  return lines.join("\n");
}

async function patchStatus(id: number, status: string) {
  await fetch("/api/crm/leads/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
}

export function CrmTab() {
  const [data,     setData]     = useState<CrmResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [country,  setCountry]  = useState("");
  const [industry, setIndustry] = useState("");
  const [search,   setSearch]   = useState("");
  const [busy,     setBusy]     = useState<Record<number, boolean>>({});
  const [scanning, setScanning] = useState<Record<number, boolean>>({});

  async function runScan(lead: CrmLead) {
    if (!lead.website) return;
    setScanning(s => ({ ...s, [lead.id]: true }));
    try {
      const res = await fetch("/api/crm/leads/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, name: lead.name, website: lead.website }),
      });
      const { scan } = await res.json();
      if (scan) {
        setData(prev => prev ? {
          ...prev,
          leads: prev.leads.map(l => l.id === lead.id
            ? { ...l, scan_sec: scan.secScore, scan_seo: scan.seoScore, scan_sem: scan.semScore, scan_json: JSON.stringify(scan) }
            : l),
        } : prev);
      }
    } finally {
      setScanning(s => ({ ...s, [lead.id]: false }));
    }
  }

  async function setStatus(id: number, status: string) {
    setBusy(b => ({ ...b, [id]: true }));
    await patchStatus(id, status);
    if (status === "PENDING") {
      // Undo: reload current page so the lead comes back to the right position
      await load();
    } else {
      // Sent / Skipped: remove from current page immediately — it'll appear at the end
      setData(prev => prev ? {
        ...prev,
        leads: prev.leads.filter(l => l.id !== id),
      } : prev);
    }
    setBusy(b => ({ ...b, [id]: false }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), country, industry, tier: "", q: search });
      const res = await fetch(`/api/crm/leads?${p}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [page, country, industry, search]);

  useEffect(() => { load(); }, [load]);

  const totalAll = Object.values(data?.countryCounts ?? {}).reduce((a, b) => a + b, 0);
  const offset   = (page - 1) * 50;

  return (
    <div className="space-y-4">

      {/* Counter + filters */}
      <div className="flex items-center gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 shrink-0">
          <p className="text-xs text-blue-500 uppercase tracking-wide font-medium">Pipeline leads</p>
          <p className="text-2xl font-bold text-blue-700">{data ? data.total.toLocaleString() : "…"}</p>
        </div>
        <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-3 items-center flex-1">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, city, website…"
            className="border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={industry}
            onChange={e => { setIndustry(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          >
            <option value="">All industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          {(country || industry || search) && (
            <button onClick={() => { setCountry(""); setIndustry(""); setSearch(""); setPage(1); }}
              className="text-sm text-red-500 hover:underline px-2">Clear</button>
          )}
        </div>
      </div>

      {/* Table + country sidebar */}
      <div className="flex gap-3 items-start">

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden flex-1 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Segment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Audit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Maps</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="sticky right-0 bg-gray-50 border-l px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Send / Skip</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : !data || data.leads.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No leads found</td></tr>
                ) : data.leads.map((lead, i) => {
                  const badge = INDUSTRY_BADGE[lead.industry];
                  const location = [lead.city, lead.country_iso].filter(Boolean).join(", ");
                  const scan: ScanData | null = lead.scan_json ? JSON.parse(lead.scan_json) : null;
                  const copyText = scan
                    ? buildColdCallReport(lead, scan)
                    : [
                        `${lead.name}  ·  ${lead.industry}`,
                        ``,
                        `Category : ${lead.industry}`,
                        ``,
                        `Location : ${location || "—"}`,
                        ``,
                        `Phone    : ${lead.phone || "—"}`,
                        ``,
                        `Website  : ${lead.website || "—"}`,
                        lead.linkedin_url     ? `\nLinkedIn : ${lead.linkedin_url}`     : "",
                        lead.google_maps_url  ? `\nMaps     : ${lead.google_maps_url}`  : "",
                        ``,
                        `Rating   : — (click 🔍 Scan to audit)`,
                        ``,
                        `Emails   : none yet`,
                      ].join("\n");
                  const rowBg =
                    lead.status === "SENT"    ? "bg-green-50 hover:bg-green-100" :
                    lead.status === "SKIPPED" ? "bg-yellow-50 hover:bg-yellow-100" :
                    "hover:bg-blue-50";
                  return (
                    <tr key={lead.id} className={`transition-colors ${rowBg}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">{offset + i + 1}</td>

                      {/* Name */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="font-medium text-gray-800 truncate" title={lead.name}>{lead.name}</p>
                      </td>

                      {/* Segment */}
                      <td className="px-4 py-3">
                        {badge
                          ? <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.cls}`}>{badge.icon} {lead.industry}</span>
                          : <span className="text-xs text-gray-500">{lead.industry}</span>}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="text-base leading-none">{FLAG[lead.country_iso] ?? ""}</span>
                          <span>{[lead.city, lead.country_iso].filter(Boolean).join(", ") || "—"}</span>
                        </span>
                      </td>

                      {/* Phone + WhatsApp */}
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{lead.phone || "—"}</span>
                          {lead.phone && (
                            <a href={`https://wa.me/${lead.phone.replace(/[\s\-().+]/g, "")}`}
                               target="_blank" rel="noreferrer" title="WhatsApp"
                               className="text-green-500 hover:text-green-600 transition shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Website */}
                      <td className="px-4 py-3 text-xs max-w-[140px] truncate">
                        {lead.website
                          ? <a href={lead.website} target="_blank" rel="noreferrer"
                               className="text-blue-600 hover:underline">
                              {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                            </a>
                          : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Audit scores + scan button */}
                      <td className="px-4 py-3 text-xs">
                        {lead.scan_sec != null ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-mono">
                              <span className={lead.scan_sec >= 70 ? "text-green-600 font-bold" : lead.scan_sec >= 40 ? "text-yellow-600 font-bold" : "text-red-500 font-bold"}>{lead.scan_sec}</span>
                              <span className="text-gray-300">/</span>
                              <span className={lead.scan_seo! >= 70 ? "text-green-600 font-bold" : lead.scan_seo! >= 40 ? "text-yellow-600 font-bold" : "text-red-500 font-bold"}>{lead.scan_seo}</span>
                              <span className="text-gray-300">/</span>
                              <span className={lead.scan_sem! >= 70 ? "text-green-600 font-bold" : lead.scan_sem! >= 40 ? "text-yellow-600 font-bold" : "text-red-500 font-bold"}>{lead.scan_sem}</span>
                            </div>
                            {lead.website && (
                              <button onClick={() => runScan(lead)} disabled={scanning[lead.id]}
                                className="text-[10px] text-gray-400 hover:text-blue-500 transition disabled:opacity-40">
                                {scanning[lead.id] ? "scanning…" : "↻ rescan"}
                              </button>
                            )}
                          </div>
                        ) : lead.website ? (
                          <button onClick={() => runScan(lead)} disabled={scanning[lead.id]}
                            className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition font-medium disabled:opacity-40 text-xs">
                            {scanning[lead.id] ? "scanning…" : "🔍 Scan"}
                          </button>
                        ) : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <CopyBtn text={copyText} label="Copy Lead" />
                          <CopyBtn variant="purple" label="Copy Report" text={copyText} />
                          {lead.linkedin_url
                            ? <a href={lead.linkedin_url} target="_blank" rel="noreferrer"
                                 className="text-xs px-2.5 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 transition font-medium">
                                LinkedIn
                              </a>
                            : <a href={`https://www.google.com/search?q=site%3Alinkedin.com%2Fcompany+%22${encodeURIComponent(lead.name)}%22`}
                                 target="_blank" rel="noreferrer"
                                 className="text-xs px-2.5 py-1 rounded bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition font-medium"
                                 title={`Find "${lead.name}" on LinkedIn`}>
                                LinkedIn?
                              </a>}
                          <a href={`https://www.google.com/search?q=site%3Ainstagram.com+%22${encodeURIComponent(lead.name)}%22`}
                             target="_blank" rel="noreferrer"
                             className="text-xs px-2.5 py-1 rounded bg-gray-100 text-gray-400 hover:bg-pink-100 hover:text-pink-600 transition font-medium"
                             title={`Find "${lead.name}" on Instagram`}>
                            Instagram?
                          </a>
                        </div>
                      </td>

                      {/* Maps */}
                      <td className="px-4 py-3 text-xs">
                        {lead.google_maps_url
                          ? <a href={lead.google_maps_url} target="_blank" rel="noreferrer"
                               className="text-gray-400 hover:text-gray-700">Maps</a>
                          : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        {lead.status === "SENT"
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Sent</span>
                          : lead.status === "SKIPPED"
                          ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Skipped</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Pending</span>}
                      </td>

                      {/* Send / Skip / Undo */}
                      <td className="sticky right-0 bg-white border-l px-3 py-3 text-center">
                        {lead.status === "PENDING" && (
                          <div className="flex flex-col gap-1.5">
                            <button disabled={busy[lead.id]} onClick={() => setStatus(lead.id, "SENT")}
                              className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-40 transition font-medium w-full">
                              ✓ Sent
                            </button>
                            <button disabled={busy[lead.id]} onClick={() => setStatus(lead.id, "SKIPPED")}
                              className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1.5 rounded hover:bg-yellow-200 disabled:opacity-40 transition font-medium w-full">
                              ⏭ Skip
                            </button>
                          </div>
                        )}
                        {(lead.status === "SENT" || lead.status === "SKIPPED") && (
                          <button disabled={busy[lead.id]} onClick={() => setStatus(lead.id, "PENDING")}
                            className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition w-full">
                            ↩ Undo
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
              <span className="text-gray-500">
                Page {page} of {data.pages} · {data.total.toLocaleString()} leads
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 border rounded hover:bg-white disabled:opacity-40">← Prev</button>
                <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border rounded hover:bg-white disabled:opacity-40">Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Vertical country tabs */}
        <div className="flex flex-col gap-1 shrink-0">
          {[
            { value: "", label: "All", flag: "🌍", cnt: totalAll },
            { value: "IT", label: "IT", flag: "🇮🇹", cnt: data?.countryCounts?.["IT"] ?? 0 },
            { value: "PL", label: "PL", flag: "🇵🇱", cnt: data?.countryCounts?.["PL"] ?? 0 },
            { value: "NL", label: "NL", flag: "🇳🇱", cnt: data?.countryCounts?.["NL"] ?? 0 },
          ].map(c => (
            <button key={c.value} onClick={() => { setCountry(c.value); setPage(1); }}
              className={`flex flex-col items-center px-4 py-3 rounded-xl border text-sm font-semibold transition w-20 ${
                country === c.value
                  ? "bg-blue-50 border-blue-400 text-blue-700"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
              }`}>
              <span className="text-lg leading-none">{c.flag}</span>
              <span className="mt-1">{c.label}</span>
              <span className="text-[10px] font-normal opacity-60 mt-0.5">{c.cnt.toLocaleString()}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
