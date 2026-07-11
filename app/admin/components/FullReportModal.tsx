"use client";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface LeadReport {
  scannedAt: string;
  loadTimeMs: number | null;
  sslValid: boolean | null;
  sslExpiryDays: number | null;
  sslIssuer: string | null;
  hasViewport: boolean | null;
  hasTouchIcon: boolean | null;
  totalLinks: number | null;
  brokenLinks: number | null;
  brokenUrls: string | null;
  hasFacebook: boolean | null;
  hasInstagram: boolean | null;
  hasLinkedIn: boolean | null;
  hasTiktok: boolean | null;
  hasYoutube: boolean | null;
  hasTwitter: boolean | null;
  hasSPF: boolean | null;
  hasDKIM: boolean | null;
  hasDMARC: boolean | null;
  spfValue: string | null;
  dmarcPolicy: string | null;
  error: string | null;
}

interface LighthouseScan {
  secScore: number;
  seoScore: number;
  semScore: number;
  https: boolean;
  hsts: boolean;
  xfo: boolean;
  csp: boolean;
  hasTitle: boolean;
  hasMeta: boolean;
  hasH1: boolean;
  hasCanonical: boolean;
  hasOg: boolean;
  hasRobots: boolean;
  hasSitemap: boolean;
  hasGa: boolean;
  hasGtm: boolean;
  hasFbPixel: boolean;
  hasSchemaOrg: boolean;
}

interface Props {
  leadId: number;
  leadName: string;
  website: string | null;
  onClose: () => void;
}

function scoreColor(v: number): string {
  if (v >= 70) return "text-green-400";
  if (v >= 40) return "text-yellow-400";
  return "text-red-400";
}

function Check({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return <span className="text-gray-500 text-sm">— {label}</span>;
  return (
    <span className={`text-sm ${ok ? "text-green-400" : "text-red-400"}`}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function buildCopyText(
  leadName: string,
  website: string,
  report: LeadReport,
  lh: LighthouseScan | null | undefined
): string {
  const lines: string[] = [];
  lines.push(`FULL WEBSITE REPORT — ${leadName}`);
  lines.push(`Website: ${website}`);
  lines.push(`Scanned: ${new Date(report.scannedAt).toLocaleDateString()}`);
  lines.push("");

  if (lh) {
    lines.push("── LIGHTHOUSE AUDIT ──");
    lines.push(`Security: ${lh.secScore}/100`);
    if (!lh.https)       lines.push("  ✗ No HTTPS — site is insecure");
    if (!lh.hsts)        lines.push("  ✗ No HSTS header");
    if (!lh.xfo)         lines.push("  ✗ No X-Frame-Options header");
    if (!lh.csp)         lines.push("  ✗ No Content Security Policy");
    lines.push(`SEO: ${lh.seoScore}/100`);
    if (!lh.hasTitle)    lines.push("  ✗ Missing page title");
    if (!lh.hasMeta)     lines.push("  ✗ Missing meta description");
    if (!lh.hasH1)       lines.push("  ✗ Missing H1 tag");
    if (!lh.hasCanonical)lines.push("  ✗ No canonical URL");
    if (!lh.hasRobots)   lines.push("  ✗ No robots.txt");
    if (!lh.hasSitemap)  lines.push("  ✗ No sitemap.xml");
    lines.push(`Tracking: ${lh.semScore}/100`);
    if (!lh.hasGa && !lh.hasGtm) lines.push("  ✗ No analytics installed");
    if (!lh.hasFbPixel)  lines.push("  ✗ No Meta Pixel");
    if (!lh.hasSchemaOrg)lines.push("  ✗ No Schema.org structured data");
    lines.push("");
  }

  lines.push("── PAGE SPEED ──");
  if (report.loadTimeMs != null) {
    const s = (report.loadTimeMs / 1000).toFixed(1);
    lines.push(`Load time: ${s}s${report.loadTimeMs > 3000 ? " ⚠ SLOW (>3s)" : " ✓ OK"}`);
    if (report.loadTimeMs > 3000)
      lines.push(`  → Your homepage takes ${s} seconds to load. Google drops rankings for anything over 3 seconds — and 53% of mobile visitors leave before it finishes.`);
  } else {
    lines.push("Load time: not measured");
  }
  lines.push("");

  lines.push("── SSL CERTIFICATE ──");
  if (report.sslValid != null) {
    lines.push(`Valid: ${report.sslValid ? "Yes" : "NO — EXPIRED OR MISSING"}`);
    if (report.sslExpiryDays != null) lines.push(`Expires in: ${report.sslExpiryDays} days`);
    if (report.sslIssuer) lines.push(`Issuer: ${report.sslIssuer}`);
    if (report.sslExpiryDays != null && report.sslExpiryDays < 30)
      lines.push(`  → Your SSL certificate expires in ${report.sslExpiryDays} days. When it lapses every browser blocks visitors with a full-screen red warning page.`);
  } else {
    lines.push("SSL: could not check");
  }
  lines.push("");

  lines.push("── MOBILE FRIENDLINESS ──");
  if (report.hasViewport != null) {
    lines.push(`Viewport meta tag: ${report.hasViewport ? "✓ Present" : "✗ MISSING"}`);
    lines.push(`Apple touch icon: ${report.hasTouchIcon ? "✓" : "✗ missing"}`);
    if (!report.hasViewport)
      lines.push("  → No mobile viewport tag — over 60% of local searches happen on phones and your layout breaks on every one of them.");
  } else {
    lines.push("Mobile: could not check");
  }
  lines.push("");

  lines.push("── BROKEN LINKS ──");
  if (report.brokenLinks != null) {
    lines.push(`Links checked: ${report.totalLinks ?? 0} | Broken: ${report.brokenLinks}`);
    if (report.brokenLinks > 0) {
      const urls: string[] = JSON.parse(report.brokenUrls ?? "[]");
      urls.slice(0, 3).forEach(u => lines.push(`  ✗ ${u}`));
      lines.push(`  → We found ${report.brokenLinks} broken link(s) — visitors and Google bots both hit dead ends, which hurts your ranking.`);
    }
  } else {
    lines.push("Links: could not check");
  }
  lines.push("");

  lines.push("── SOCIAL MEDIA PRESENCE ──");
  const socialPresent = [
    report.hasFacebook && "Facebook",
    report.hasInstagram && "Instagram",
    report.hasLinkedIn && "LinkedIn",
    report.hasTiktok && "TikTok",
    report.hasYoutube && "YouTube",
    report.hasTwitter && "X/Twitter",
  ].filter(Boolean);
  const socialMissing = [
    !report.hasFacebook && "Facebook",
    !report.hasInstagram && "Instagram",
    !report.hasLinkedIn && "LinkedIn",
    !report.hasTiktok && "TikTok",
    !report.hasYoutube && "YouTube",
    !report.hasTwitter && "X/Twitter",
  ].filter(Boolean);
  if (socialPresent.length) lines.push(`Found: ${socialPresent.join(", ")}`);
  if (socialMissing.length) {
    lines.push(`Missing: ${socialMissing.join(", ")}`);
    if (socialPresent.length === 0)
      lines.push("  → No social media found — competitors are running retargeting ads to your past visitors while you have no social presence to retarget from.");
  }
  lines.push("");

  lines.push("── EMAIL DELIVERABILITY ──");
  if (report.hasSPF != null) {
    lines.push(`SPF record: ${report.hasSPF ? "✓" : "✗ MISSING"}`);
    lines.push(`DKIM record: ${report.hasDKIM ? "✓" : "✗ MISSING"}`);
    lines.push(`DMARC record: ${report.hasDMARC ? `✓ (policy: ${report.dmarcPolicy})` : "✗ MISSING"}`);
    if (!report.hasDMARC)
      lines.push("  → No DMARC record — your business emails are statistically likely landing in the spam folder of every prospect you contact.");
  } else {
    lines.push("Email: could not check");
  }

  return lines.join("\n");
}

export default function FullReportModal({ leadId, leadName, website, onClose }: Props) {
  const [report, setReport] = useState<LeadReport | null>(null);
  const [lhScan, setLhScan] = useState<LighthouseScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/report/${leadId}`).then(r => r.json()).then(d => { if (d.report) setReport(d.report); }).catch(() => {});
    fetch(`/api/lighthouse/lead/${leadId}`).then(r => r.json()).then(d => { if (d.scan) setLhScan(d.scan); }).catch(() => {});
  }, [leadId]);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/report/${leadId}`, { method: "POST" });
      const data = await res.json();
      if (data.report) setReport(data.report);
      else if (data.error) setError(data.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  }, [leadId]);

  const handleCopy = useCallback(() => {
    if (!report || !website) return;
    const text = buildCopyText(leadName, website, report, lhScan);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [report, leadName, website, lhScan]);

  const brokenList: string[] = report?.brokenUrls ? JSON.parse(report.brokenUrls) : [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold text-lg">{leadName}</h2>
            {website && <p className="text-gray-400 text-xs">{website}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={runScan}
              disabled={scanning || !website}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
            >
              {scanning ? "Scanning…" : report ? "Re-scan" : "Run Full Scan"}
            </button>
            {report && (
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium text-sm"
              >
                {copied ? "Copied!" : "Copy Full Report + Pitch"}
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {!report && !scanning && (
            <p className="text-gray-500">No report yet. Click "Run Full Scan" to analyse this website.</p>
          )}

          {scanning && (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Running 6 checks (page speed, SSL, mobile, links, social, DNS)…
            </div>
          )}

          {report && !scanning && (
            <>
              <p className="text-gray-500 text-xs">
                Scanned {new Date(report.scannedAt).toLocaleString()}
              </p>

              {/* Lighthouse scores inline */}
              {lhScan && (
                <section>
                  <h3 className="text-gray-300 font-semibold mb-2">Lighthouse Audit</h3>
                  <div className="flex gap-6 mb-2">
                    <div>
                      <span className="text-gray-500 text-xs">Security</span>
                      <p className={`text-xl font-bold ${scoreColor(lhScan.secScore)}`}>{lhScan.secScore}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">SEO</span>
                      <p className={`text-xl font-bold ${scoreColor(lhScan.seoScore)}`}>{lhScan.seoScore}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Tracking</span>
                      <p className={`text-xl font-bold ${scoreColor(lhScan.semScore)}`}>{lhScan.semScore}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-400">
                    <Check ok={lhScan.https} label="HTTPS" />
                    <Check ok={lhScan.hsts} label="HSTS header" />
                    <Check ok={lhScan.xfo} label="X-Frame-Options" />
                    <Check ok={lhScan.csp} label="Content Security Policy" />
                    <Check ok={lhScan.hasTitle} label="Page title" />
                    <Check ok={lhScan.hasMeta} label="Meta description" />
                    <Check ok={lhScan.hasH1} label="H1 tag" />
                    <Check ok={lhScan.hasCanonical} label="Canonical URL" />
                    <Check ok={lhScan.hasRobots} label="robots.txt" />
                    <Check ok={lhScan.hasSitemap} label="sitemap.xml" />
                    <Check ok={lhScan.hasGa} label="Google Analytics" />
                    <Check ok={lhScan.hasGtm} label="Google Tag Manager" />
                    <Check ok={lhScan.hasFbPixel} label="Meta Pixel" />
                    <Check ok={lhScan.hasSchemaOrg} label="Schema.org" />
                  </div>
                </section>
              )}

              {/* Page Speed */}
              <section>
                <h3 className="text-gray-300 font-semibold mb-1">Page Speed</h3>
                {report.loadTimeMs != null ? (
                  <p className={report.loadTimeMs > 3000 ? "text-red-400" : "text-green-400"}>
                    {(report.loadTimeMs / 1000).toFixed(1)}s load time
                    {report.loadTimeMs > 3000 && " — SLOW (>3s, Google penalises)"}
                  </p>
                ) : <p className="text-gray-500">Could not measure</p>}
              </section>

              {/* SSL */}
              <section>
                <h3 className="text-gray-300 font-semibold mb-1">SSL Certificate</h3>
                {report.sslValid != null ? (
                  <div className="space-y-0.5">
                    <Check ok={report.sslValid} label={report.sslValid ? "Valid" : "Invalid / Expired"} />
                    {report.sslExpiryDays != null && (
                      <p className={`text-sm ${report.sslExpiryDays < 30 ? "text-red-400" : "text-gray-400"}`}>
                        Expires in {report.sslExpiryDays} days{report.sslExpiryDays < 30 ? " ⚠" : ""}
                        {report.sslIssuer ? ` · ${report.sslIssuer}` : ""}
                      </p>
                    )}
                  </div>
                ) : <p className="text-gray-500">Could not check (HTTP only?)</p>}
              </section>

              {/* Mobile */}
              <section>
                <h3 className="text-gray-300 font-semibold mb-1">Mobile Friendliness</h3>
                {report.hasViewport != null ? (
                  <div className="flex flex-col gap-0.5">
                    <Check ok={report.hasViewport} label="Viewport meta tag" />
                    <Check ok={report.hasTouchIcon} label="Apple touch icon" />
                  </div>
                ) : <p className="text-gray-500">Could not check</p>}
              </section>

              {/* Broken Links */}
              <section>
                <h3 className="text-gray-300 font-semibold mb-1">Broken Links</h3>
                {report.brokenLinks != null ? (
                  <>
                    <p className={report.brokenLinks > 0 ? "text-red-400" : "text-green-400"}>
                      {report.brokenLinks} broken / {report.totalLinks} checked
                    </p>
                    {brokenList.slice(0, 5).map(u => (
                      <p key={u} className="text-red-400 text-xs ml-2 truncate">{u}</p>
                    ))}
                  </>
                ) : <p className="text-gray-500">Could not check</p>}
              </section>

              {/* Social */}
              <section>
                <h3 className="text-gray-300 font-semibold mb-1">Social Media</h3>
                <div className="grid grid-cols-3 gap-1">
                  <Check ok={report.hasFacebook} label="Facebook" />
                  <Check ok={report.hasInstagram} label="Instagram" />
                  <Check ok={report.hasLinkedIn} label="LinkedIn" />
                  <Check ok={report.hasTiktok} label="TikTok" />
                  <Check ok={report.hasYoutube} label="YouTube" />
                  <Check ok={report.hasTwitter} label="X/Twitter" />
                </div>
              </section>

              {/* Email Deliverability */}
              <section>
                <h3 className="text-gray-300 font-semibold mb-1">Email Deliverability</h3>
                {report.hasSPF != null ? (
                  <div className="flex flex-col gap-0.5">
                    <Check ok={report.hasSPF} label={`SPF${report.spfValue ? ` — ${report.spfValue.slice(0, 40)}` : ""}`} />
                    <Check ok={report.hasDKIM} label="DKIM" />
                    <Check ok={report.hasDMARC} label={`DMARC${report.dmarcPolicy ? ` (policy: ${report.dmarcPolicy})` : ""}`} />
                  </div>
                ) : <p className="text-gray-500">Could not check DNS</p>}
              </section>

              {report.error && (
                <p className="text-red-400 text-xs">Scan error: {report.error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
