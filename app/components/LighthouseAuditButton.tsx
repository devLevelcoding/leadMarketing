"use client";
import { useState, useEffect, useRef } from "react";

type Scan = {
  url: string;
  secScore: number; seoScore: number; semScore: number;
  https: boolean; hsts: boolean; xfo: boolean; csp: boolean; xcto: boolean; xssHeader: boolean;
  hasTitle: boolean; hasMeta: boolean; hasH1: boolean; hasCanonical: boolean;
  hasOg: boolean; hasRobots: boolean; hasSitemap: boolean;
  hasGa: boolean; hasGtm: boolean; hasFbPixel: boolean; hasLinkedIn: boolean;
  hasSchemaOrg: boolean; hasHotjar: boolean;
  error: string | null;
};

function scoreColor(s: number) {
  return s >= 70 ? "text-green-600" : s >= 40 ? "text-yellow-600" : "text-red-500";
}

function buildAuditText(leadName: string, scan: Scan): string {
  const secIssues: string[] = [];
  if (!scan.https)     secIssues.push("• Site is not loading over HTTPS (plain HTTP — no encryption)");
  if (!scan.hsts)      secIssues.push("• Missing HSTS header (browsers can downgrade to HTTP)");
  if (!scan.xfo)       secIssues.push("• No X-Frame-Options (vulnerable to clickjacking attacks)");
  if (!scan.csp)       secIssues.push("• No Content Security Policy (XSS injection risk)");
  if (!scan.xcto)      secIssues.push("• Missing X-Content-Type-Options header");

  const seoIssues: string[] = [];
  if (!scan.hasTitle)     seoIssues.push("• No <title> tag — invisible to search engines");
  if (!scan.hasMeta)      seoIssues.push("• No meta description — Google won't show a snippet");
  if (!scan.hasH1)        seoIssues.push("• No H1 heading — poor page structure for SEO");
  if (!scan.hasCanonical) seoIssues.push("• No canonical URL — risk of duplicate content penalty");
  if (!scan.hasOg)        seoIssues.push("• No Open Graph tags — poor social media sharing preview");
  if (!scan.hasRobots)    seoIssues.push("• No robots.txt found");
  if (!scan.hasSitemap)   seoIssues.push("• No sitemap.xml — search engines may miss pages");

  const semIssues: string[] = [];
  if (!scan.hasGa)        semIssues.push("• No Google Analytics — no traffic data at all");
  if (!scan.hasGtm)       semIssues.push("• No Google Tag Manager — no tag infrastructure");
  if (!scan.hasFbPixel)   semIssues.push("• No Facebook Pixel — can't run retargeting ads");
  if (!scan.hasLinkedIn)  semIssues.push("• No LinkedIn Insight Tag — missing B2B audience data");
  if (!scan.hasSchemaOrg) semIssues.push("• No Schema.org markup — no rich results in Google");

  const lines: string[] = [
    `Website Audit — ${leadName}`,
    `${scan.url}`,
    ``,
    `SECURITY   ${scan.secScore}/100`,
    ...(secIssues.length > 0 ? secIssues : ["• All key security headers are in place"]),
    ``,
    `SEO   ${scan.seoScore}/100`,
    ...(seoIssues.length > 0 ? seoIssues : ["• Core SEO signals are present"]),
    ``,
    `MARKETING   ${scan.semScore}/100`,
    ...(semIssues.length > 0 ? semIssues : ["• Key tracking tools are set up"]),
  ];

  return lines.join("\n");
}

export default function LighthouseAuditButton({
  leadId, leadName, website,
}: {
  leadId: number; leadName: string; website: string | null;
}) {
  const [open, setOpen]   = useState(false);
  const [scan, setScan]   = useState<Scan | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (scan) return;
    setLoading(true);
    const res  = await fetch(`/api/lighthouse/lead/${leadId}`);
    const data = await res.json();
    setScan(data.scan ?? null);
    setLoading(false);
  }

  function copyAudit() {
    if (!scan) return;
    navigator.clipboard.writeText(buildAuditText(leadName, scan));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!website) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        title="Lighthouse audit"
        className={`text-xs px-2.5 py-1 rounded font-medium transition ${
          open
            ? "bg-indigo-600 text-white"
            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
        }`}
      >
        {scan && !open ? (
          <span className="flex items-center gap-1">
            <span title="Security" className={`font-bold ${scoreColor(scan.secScore)}`}>{scan.secScore}</span>
            <span className="text-gray-300">/</span>
            <span title="SEO" className={`font-bold ${scoreColor(scan.seoScore)}`}>{scan.seoScore}</span>
            <span className="text-gray-300">/</span>
            <span title="SEM" className={`font-bold ${scoreColor(scan.semScore)}`}>{scan.semScore}</span>
          </span>
        ) : "Audit"}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border rounded-xl shadow-2xl w-72 text-xs">
          {loading ? (
            <p className="px-4 py-5 text-gray-400 text-center">Loading scan…</p>
          ) : !scan ? (
            <div className="px-4 py-4 text-center space-y-2">
              <p className="text-gray-500">No scan for this lead yet.</p>
              <a href="/lighthouse" className="text-blue-600 hover:underline text-xs">
                Run a Lighthouse scan →
              </a>
            </div>
          ) : (
            <>
              <div className="px-4 pt-3 pb-2 border-b">
                <p className="font-semibold text-gray-700 truncate">{leadName}</p>
                <p className="text-gray-400 truncate">{scan.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
              </div>

              {/* Score bars */}
              <div className="px-4 py-3 space-y-2 border-b">
                {([
                  { label: "Security", score: scan.secScore,
                    checks: [
                      ["HTTPS",  scan.https], ["HSTS", scan.hsts], ["X-Frame-Options", scan.xfo],
                      ["CSP",    scan.csp],   ["XCTO", scan.xcto],
                    ] },
                  { label: "SEO", score: scan.seoScore,
                    checks: [
                      ["Title",     scan.hasTitle],  ["Meta desc",   scan.hasMeta],
                      ["H1",        scan.hasH1],     ["Canonical",   scan.hasCanonical],
                      ["Robots.txt",scan.hasRobots], ["Sitemap.xml", scan.hasSitemap],
                    ] },
                  { label: "Marketing", score: scan.semScore,
                    checks: [
                      ["Google Analytics", scan.hasGa],    ["GTM",     scan.hasGtm],
                      ["Facebook Pixel",   scan.hasFbPixel],["Schema", scan.hasSchemaOrg],
                      ["LinkedIn",         scan.hasLinkedIn],
                    ] },
                ] as const).map(({ label, score, checks }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-gray-500">{label}</span>
                      <span className={`font-bold ${scoreColor(score)}`}>{score}/100</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${score >= 70 ? "bg-green-400" : score >= 40 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {(checks as unknown as [string, boolean][]).map(([name, ok]) => (
                        <span key={name} className={ok ? "text-green-600" : "text-red-400"}>
                          {ok ? "✓" : "✗"} {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="px-4 py-2.5 flex items-center gap-2">
                <button
                  onClick={copyAudit}
                  className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
                >
                  {copied ? "Copied!" : "Copy Audit for Email"}
                </button>
                <a
                  href="/lighthouse"
                  className="text-indigo-500 hover:text-indigo-700 text-xs whitespace-nowrap"
                >
                  View all →
                </a>
              </div>

              {scan.error && (
                <p className="px-4 pb-2 text-red-400 text-xs truncate" title={scan.error}>
                  ⚠ {scan.error}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
