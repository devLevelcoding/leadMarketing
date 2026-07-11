"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

type Scan = {
  id: number;
  leadId: number;
  url: string;
  scannedAt: string;
  https: boolean; hsts: boolean; xfo: boolean; csp: boolean; xcto: boolean; xssHeader: boolean; secScore: number;
  hasTitle: boolean; hasMeta: boolean; hasH1: boolean; hasCanonical: boolean; hasOg: boolean; hasRobots: boolean; hasSitemap: boolean; seoScore: number;
  hasGa: boolean; hasGtm: boolean; hasFbPixel: boolean; hasLinkedIn: boolean; hasSchemaOrg: boolean; hasHotjar: boolean; semScore: number;
  statusCode: number | null;
  error: string | null;
  lead: { name: string; domain: string; country: string; city: string };
};

type SortKey = "secScore" | "seoScore" | "semScore" | "url";

const PHASES = [
  { value: "", label: "All Phases" },
  { value: "1", label: "Phase 1 — Europe" },
  { value: "2", label: "Phase 2 — Dubai" },
  { value: "3", label: "Phase 3 — USA" },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-100 text-green-700" :
    score >= 40 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";
  return (
    <span className={`inline-block w-10 text-center text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
      {score}
    </span>
  );
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${on ? "bg-green-400" : "bg-red-300"}`} />
  );
}

function avgScore(scans: Scan[], key: "secScore" | "seoScore" | "semScore") {
  if (!scans.length) return 0;
  return Math.round(scans.reduce((s, sc) => s + sc[key], 0) / scans.length);
}

export default function LighthousePage() {
  const [scans,    setScans]    = useState<Scan[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const [phase,   setPhase]   = useState("");
  const [limit,   setLimit]   = useState("100");
  const [sortBy,  setSortBy]  = useState<SortKey>("secScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter,  setFilter]  = useState("");

  const esRef = useRef<ReadableStreamDefaultReader | null>(null);

  const loadScans = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sortBy, sortDir, ...(filter ? { filter } : {}) });
    const res  = await fetch(`/api/lighthouse/scans?${params}`);
    const data = await res.json();
    setScans(data.scans || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [sortBy, sortDir, filter]);

  useEffect(() => { loadScans(); }, [loadScans]);

  async function startScan() {
    setScanning(true);
    setProgress({ done: 0, total: 0 });
    setScans([]);

    const body = JSON.stringify({ limit: parseInt(limit), ...(phase ? { phase } : {}) });
    const res  = await fetch("/api/lighthouse/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body });

    const reader = res.body!.getReader();
    esRef.current = reader;
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const data = line.replace(/^data: /, "").trim();
        if (!data) continue;
        try {
          const msg = JSON.parse(data);
          if (msg.type === "start")    setProgress({ done: 0, total: msg.total });
          if (msg.type === "progress") setProgress({ done: msg.done, total: msg.total });
          if (msg.type === "done")     setScanning(false);
        } catch { /* skip */ }
      }
    }

    setScanning(false);
    loadScans();
  }

  async function clearScans() {
    if (!confirm("Delete all scan results?")) return;
    await fetch("/api/lighthouse/scans", { method: "DELETE" });
    setScans([]); setTotal(0);
  }

  function sort(col: SortKey) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function exportCsv() {
    const rows = [
      ["Name","URL","Country","City","Domain","HTTP Status","Error",
       "SecScore","HTTPS","HSTS","XFO","CSP","XCTO","XSS",
       "SeoScore","Title","Meta","H1","Canonical","OG","Robots","Sitemap",
       "SemScore","GA","GTM","FbPixel","LinkedIn","SchemaOrg","Hotjar"],
      ...scans.map(s => [
        s.lead.name, s.url, s.lead.country, s.lead.city, s.lead.domain,
        s.statusCode ?? "", s.error ?? "",
        s.secScore, s.https, s.hsts, s.xfo, s.csp, s.xcto, s.xssHeader,
        s.seoScore, s.hasTitle, s.hasMeta, s.hasH1, s.hasCanonical, s.hasOg, s.hasRobots, s.hasSitemap,
        s.semScore, s.hasGa, s.hasGtm, s.hasFbPixel, s.hasLinkedIn, s.hasSchemaOrg, s.hasHotjar,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `lighthouse-scan-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Lighthouse Scanner
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Security headers · SEO signals · SEM tracking pixels — up to 200 leads at once
          </p>
        </div>
        {total > 0 && (
          <button onClick={clearScans} className="text-xs text-red-500 hover:underline">
            Clear all results
          </button>
        )}
      </div>

      {/* Scan controls */}
      <div className="bg-white border rounded-xl p-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Phase</label>
          <select
            value={phase} onChange={e => setPhase(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Max leads</label>
          <select
            value={limit} onChange={e => setLimit(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {["25","50","100","150","200"].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          onClick={startScan}
          disabled={scanning}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? `Scanning… ${progress.done}/${progress.total}` : "Run Scan"}
        </button>
      </div>

      {/* Progress bar */}
      {scanning && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Scanning websites concurrently…</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary cards */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Avg Security", key: "secScore" as const, icon: "🔒", desc: "Headers: HTTPS, HSTS, CSP…" },
            { label: "Avg SEO",      key: "seoScore" as const, icon: "🔍", desc: "Title, meta, robots, sitemap…" },
            { label: "Avg SEM",      key: "semScore" as const, icon: "📊", desc: "GA, GTM, FB Pixel, Schema…" },
          ].map(({ label, key, icon, desc }) => {
            const avg = avgScore(scans, key);
            const color = avg >= 70 ? "text-green-600" : avg >= 40 ? "text-yellow-600" : "text-red-600";
            return (
              <div key={key} className="bg-white border rounded-xl p-5 flex items-center gap-4">
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`text-3xl font-bold ${color}`}>{avg}<span className="text-base text-gray-400">/100</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters + export */}
      {total > 0 && (
        <div className="flex gap-3 items-center">
          <select
            value={filter} onChange={e => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">All results</option>
            <option value="no_https">No HTTPS</option>
            <option value="errors">Errors only</option>
          </select>
          <button
            onClick={exportCsv}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Export CSV
          </button>
          <span className="text-sm text-gray-400">{total.toLocaleString()} scanned</span>
        </div>
      )}

      {/* Results table */}
      {total > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-48">Lead</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">URL</th>
                  {/* Security */}
                  <th className="px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600 text-center" onClick={() => sort("secScore")}>
                    🔒 Sec<SortIcon col="secScore" />
                  </th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">HTTPS</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">HSTS</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">XFO</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">CSP</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">XCTO</th>
                  {/* SEO */}
                  <th className="px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600 text-center border-l" onClick={() => sort("seoScore")}>
                    🔍 SEO<SortIcon col="seoScore" />
                  </th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Title</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Meta</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">H1</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Canon</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">OG</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Robots</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Sitemap</th>
                  {/* SEM */}
                  <th className="px-3 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600 text-center border-l" onClick={() => sort("semScore")}>
                    📊 SEM<SortIcon col="semScore" />
                  </th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">GA</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">GTM</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">FB</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">LI</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Schema</th>
                  <th className="px-2 py-3 font-medium text-gray-500 text-center">Hotjar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={23} className="text-center py-10 text-gray-400">Loading…</td></tr>
                ) : scans.map(sc => (
                  <tr key={sc.id} className={`hover:bg-blue-50 transition-colors ${sc.error ? "opacity-60" : ""}`}>
                    <td className="px-4 py-2.5">
                      <Link href={`/leads/${sc.leadId}`} className="font-medium text-blue-700 hover:underline">
                        {sc.lead.name}
                      </Link>
                      <div className="text-gray-400 mt-0.5">{sc.lead.city}, {sc.lead.country}</div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[160px]">
                      <a href={sc.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
                        {sc.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                      {sc.error && (
                        <span className="text-red-400 text-xs truncate block" title={sc.error}>
                          {sc.error.length > 40 ? sc.error.slice(0, 40) + "…" : sc.error}
                        </span>
                      )}
                      {sc.statusCode && !sc.error && (
                        <span className="text-gray-400">{sc.statusCode}</span>
                      )}
                    </td>
                    {/* Security */}
                    <td className="px-3 py-2.5 text-center"><ScoreBadge score={sc.secScore} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.https} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hsts} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.xfo} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.csp} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.xcto} /></td>
                    {/* SEO */}
                    <td className="px-3 py-2.5 text-center border-l"><ScoreBadge score={sc.seoScore} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasTitle} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasMeta} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasH1} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasCanonical} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasOg} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasRobots} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasSitemap} /></td>
                    {/* SEM */}
                    <td className="px-3 py-2.5 text-center border-l"><ScoreBadge score={sc.semScore} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasGa} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasGtm} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasFbPixel} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasLinkedIn} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasSchemaOrg} /></td>
                    <td className="px-2 py-2.5 text-center"><CheckDot on={sc.hasHotjar} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !scanning && total === 0 && (
        <div className="bg-white border rounded-xl py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium text-gray-600">No scan results yet</p>
          <p className="text-sm mt-1">Choose a phase and click <strong>Run Scan</strong> to audit your leads' websites.</p>
        </div>
      )}
    </div>
  );
}
