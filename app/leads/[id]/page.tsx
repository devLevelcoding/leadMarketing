"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LighthouseAuditButton from "@/app/components/LighthouseAuditButton";

const STATUSES = ["NEW","EMAILED","REPLIED","CONVERTED","NOT_INTERESTED"];
const STATUS_BADGE: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-600", EMAILED: "bg-blue-100 text-blue-700",
  REPLIED: "bg-yellow-100 text-yellow-700", CONVERTED: "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-red-100 text-red-600",
};

type Lead = {
  id: number; name: string; category: string; searchCategory: string;
  address: string; phone: string; website: string; rating: string;
  reviewCount: string; city: string; country: string; mapsUrl: string;
  domain: string; status: string; scrapedAt: string;
  notes: { id: number; content: string; createdAt: string }[];
  emailLogs: { id: number; subject: string; body: string; sentAt: string; status: string; template: { name: string } | null }[];
};

type Template = { id: number; name: string; language: string; domain: string | null; subject: string; body: string };

function interpolate(text: string, lead: Lead) {
  return text
    .replace(/\{\{company_name\}\}/g, lead.name)
    .replace(/\{\{city\}\}/g, lead.city || "")
    .replace(/\{\{country\}\}/g, lead.country || "")
    .replace(/\{\{website\}\}/g, lead.website || "")
    .replace(/\{\{phone\}\}/g, lead.phone || "");
}

export default function LeadDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [note, setNote] = useState("");
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [l, t] = await Promise.all([
      fetch(`/api/leads/${id}`).then(r => r.json()),
      fetch("/api/templates").then(r => r.json()),
    ]);
    setLead(l);
    setTemplates(t);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: string) {
    await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setLead(l => l ? { ...l, status } : l);
  }

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addNote: note }) });
    setNote("");
    await load();
    setSaving(false);
  }

  function openTemplate(tpl: Template) {
    if (!lead) return;
    setSelectedTpl(tpl);
    setPreviewSubject(interpolate(tpl.subject, lead));
    setPreviewBody(interpolate(tpl.body, lead));
    setShowEmailModal(true);
  }

  async function logEmail() {
    if (!selectedTpl || !lead) return;
    setSaving(true);
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logEmail: { templateId: selectedTpl.id, subject: previewSubject, body: previewBody } }),
    });
    setShowEmailModal(false);
    await load();
    setSaving(false);
  }

  if (!lead) return <div className="text-gray-400 mt-20 text-center">Loading…</div>;

  const relatedTemplates = templates.filter(t => !t.domain || t.domain === lead.domain);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/leads" className="text-sm text-blue-600 hover:underline">← Back to leads</Link>
          <h1 className="text-2xl font-bold mt-1">{lead.name}</h1>
          <p className="text-gray-500 text-sm">{lead.category} · {lead.city}, {lead.country}</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={lead.status}
            onChange={e => updateStatus(e.target.value)}
            className={`text-sm px-3 py-1.5 rounded-full border font-medium cursor-pointer ${STATUS_BADGE[lead.status]}`}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lead Info */}
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Contact Info</h2>
          <InfoRow label="Phone"   value={lead.phone}   link={`tel:${lead.phone}`} />
          <InfoRow label="Website" value={lead.website} link={lead.website} external />
          <InfoRow label="Address" value={lead.address} />
          <InfoRow label="Rating"  value={lead.rating ? `${lead.rating} ★ (${lead.reviewCount} reviews)` : undefined} />
          <InfoRow label="Domain"  value={lead.domain} />
          <InfoRow label="Scraped" value={lead.scrapedAt} />
          {lead.mapsUrl && (
            <a href={lead.mapsUrl} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline block">
              View on Google Maps →
            </a>
          )}
        </div>

        {/* Email Templates */}
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Send Email</h2>
          <p className="text-xs text-gray-400">Select a template to personalise and log</p>
          <div className="space-y-2">
            {relatedTemplates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => openTemplate(tpl)}
                className="w-full text-left border rounded-lg px-3 py-2 text-sm hover:bg-blue-50 hover:border-blue-300 transition"
              >
                <div className="font-medium">{tpl.name}</div>
                <div className="text-xs text-gray-400">{tpl.language.toUpperCase()} · {tpl.subject.slice(0, 60)}…</div>
              </button>
            ))}
            {relatedTemplates.length === 0 && (
              <p className="text-sm text-gray-400">No templates found. <Link href="/templates" className="text-blue-600 hover:underline">Create one →</Link></p>
            )}
          </div>
        </div>
      </div>

      {/* Lighthouse Audit */}
      <LighthousePanel leadId={lead.id} leadName={lead.name} website={lead.website} />

      {/* Notes */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Notes & Observations</h2>
        <div className="flex gap-2">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note… (e.g. 'Owner interested, call back Thursday')"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            rows={2}
          />
          <button
            onClick={addNote}
            disabled={saving || !note.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
          >Add</button>
        </div>
        <div className="space-y-2">
          {lead.notes.map(n => (
            <div key={n.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <p>{n.content}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {lead.notes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
        </div>
      </div>

      {/* Email History */}
      {lead.emailLogs.length > 0 && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Email History</h2>
          <div className="space-y-3">
            {lead.emailLogs.map(log => (
              <div key={log.id} className="border rounded-lg p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{log.subject}</span>
                  <span className="text-xs text-gray-400">{new Date(log.sentAt).toLocaleDateString()}</span>
                </div>
                {log.template && <p className="text-xs text-gray-400 mt-1">Template: {log.template.name}</p>}
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer">View email body</summary>
                  <pre className="mt-2 text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap">{log.body}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailModal && selectedTpl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">Email Preview</h2>
                <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <p className="text-xs text-gray-400">Variables auto-filled · Edit before logging</p>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">SUBJECT</label>
                <input
                  value={previewSubject}
                  onChange={e => setPreviewSubject(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">BODY</label>
                <textarea
                  value={previewBody}
                  onChange={e => setPreviewBody(e.target.value)}
                  rows={12}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { navigator.clipboard.writeText(`Subject: ${previewSubject}\n\n${previewBody}`); }}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                >📋 Copy</button>
                <button
                  onClick={logEmail}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >✓ Log as Sent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, link, external }: {
  label: string; value?: string | null; link?: string; external?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      {link
        ? <a href={link} target={external ? "_blank" : undefined} rel="noreferrer" className="text-blue-600 hover:underline truncate">{value}</a>
        : <span className="text-gray-700">{value}</span>}
    </div>
  );
}

// ─── Lighthouse Panel ──────────────────────────────────────────────────────────

type LhScan = {
  url: string; scannedAt: string; error: string | null;
  secScore: number; seoScore: number; semScore: number;
  https: boolean; hsts: boolean; xfo: boolean; csp: boolean; xcto: boolean; xssHeader: boolean;
  hasTitle: boolean; hasMeta: boolean; hasH1: boolean; hasCanonical: boolean;
  hasOg: boolean; hasRobots: boolean; hasSitemap: boolean;
  hasGa: boolean; hasGtm: boolean; hasFbPixel: boolean; hasLinkedIn: boolean;
  hasSchemaOrg: boolean; hasHotjar: boolean;
};

function scoreBg(s: number) {
  return s >= 70 ? "bg-green-100 text-green-700" : s >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";
}
function barColor(s: number) {
  return s >= 70 ? "bg-green-400" : s >= 40 ? "bg-yellow-400" : "bg-red-400";
}

function LighthousePanel({ leadId, leadName, website }: { leadId: number; leadName: string; website: string | null }) {
  const [scan, setScan]       = useState<LhScan | null | undefined>(undefined);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    fetch(`/api/lighthouse/lead/${leadId}`)
      .then(r => r.json())
      .then(d => setScan(d.scan ?? null));
  }, [leadId]);

  function copyAudit() {
    if (!scan) return;
    const secIssues = [
      !scan.https     && "• Site not loading over HTTPS (no encryption)",
      !scan.hsts      && "• Missing HSTS header",
      !scan.xfo       && "• No X-Frame-Options (clickjacking risk)",
      !scan.csp       && "• No Content Security Policy (XSS risk)",
      !scan.xcto      && "• Missing X-Content-Type-Options",
    ].filter(Boolean);
    const seoIssues = [
      !scan.hasTitle     && "• No <title> tag",
      !scan.hasMeta      && "• No meta description",
      !scan.hasH1        && "• No H1 heading",
      !scan.hasCanonical && "• No canonical URL",
      !scan.hasOg        && "• No Open Graph tags",
      !scan.hasRobots    && "• No robots.txt",
      !scan.hasSitemap   && "• No sitemap.xml",
    ].filter(Boolean);
    const semIssues = [
      !scan.hasGa        && "• No Google Analytics",
      !scan.hasGtm       && "• No Google Tag Manager",
      !scan.hasFbPixel   && "• No Facebook Pixel",
      !scan.hasSchemaOrg && "• No Schema.org markup",
      !scan.hasLinkedIn  && "• No LinkedIn Insight Tag",
    ].filter(Boolean);

    const text = [
      `Website Audit — ${leadName}`,
      scan.url,
      "",
      `SECURITY   ${scan.secScore}/100`,
      ...(secIssues.length ? secIssues : ["• All key security headers present"]),
      "",
      `SEO   ${scan.seoScore}/100`,
      ...(seoIssues.length ? seoIssues : ["• Core SEO signals present"]),
      "",
      `MARKETING   ${scan.semScore}/100`,
      ...(semIssues.length ? semIssues : ["• Key tracking tools detected"]),
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const CHECKS: [string, string, [string, boolean][]][] = !scan ? [] : [
    ["🔒 Security", `${scan.secScore}/100`, [
      ["HTTPS", scan.https], ["HSTS", scan.hsts], ["X-Frame-Options", scan.xfo],
      ["CSP", scan.csp], ["X-Content-Type-Options", scan.xcto], ["XSS header", scan.xssHeader],
    ]],
    ["🔍 SEO", `${scan.seoScore}/100`, [
      ["Title tag", scan.hasTitle], ["Meta description", scan.hasMeta], ["H1 heading", scan.hasH1],
      ["Canonical URL", scan.hasCanonical], ["Open Graph", scan.hasOg],
      ["robots.txt", scan.hasRobots], ["sitemap.xml", scan.hasSitemap],
    ]],
    ["📊 Marketing", `${scan.semScore}/100`, [
      ["Google Analytics", scan.hasGa], ["GTM", scan.hasGtm], ["Facebook Pixel", scan.hasFbPixel],
      ["LinkedIn Insight", scan.hasLinkedIn], ["Schema.org", scan.hasSchemaOrg], ["Hotjar", scan.hasHotjar],
    ]],
  ];

  return (
    <div className="bg-white border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Lighthouse Audit</h2>
        {scan && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Scanned {new Date(scan.scannedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button
              onClick={copyAudit}
              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              {copied ? "Copied!" : "Copy Audit for Email"}
            </button>
            <a href="/lighthouse" className="text-xs text-indigo-500 hover:underline">Run new scan →</a>
          </div>
        )}
      </div>

      {/* No website */}
      {!website && (
        <div className="flex items-center gap-3 text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-xl">🌐</span>
          <span>This lead has no website — Lighthouse scan not applicable.</span>
        </div>
      )}

      {/* Has website but not yet scanned */}
      {website && scan === null && (
        <div className="flex items-center gap-3 text-sm text-gray-500 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
          <span className="text-xl">⚠️</span>
          <span>
            Website found but not scanned yet.{" "}
            <a href="/lighthouse" className="text-blue-600 hover:underline font-medium">Run a Lighthouse scan →</a>
          </span>
        </div>
      )}

      {/* Loading */}
      {scan === undefined && (
        <p className="text-sm text-gray-400 py-2">Loading…</p>
      )}

      {/* Scan results */}
      {scan && (
        <>
          {scan.error && (
            <div className="text-xs text-red-400 bg-red-50 rounded px-3 py-2">
              Scan error: {scan.error}
            </div>
          )}

          {/* Score summary */}
          <div className="grid grid-cols-3 gap-4">
            {(["secScore", "seoScore", "semScore"] as const).map((key, i) => {
              const score = scan[key];
              const labels = ["Security", "SEO", "Marketing"];
              return (
                <div key={key} className="text-center">
                  <span className={`inline-block text-2xl font-bold px-4 py-1 rounded-xl ${scoreBg(score)}`}>
                    {score}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{labels[i]}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed checklist */}
          <div className="grid md:grid-cols-3 gap-4 pt-1">
            {CHECKS.map(([title, score, items]) => (
              <div key={title} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600">{title}</p>
                  <span className="text-xs text-gray-400">{score}</span>
                </div>
                {items.map(([label, ok]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className={ok ? "text-green-500" : "text-red-400"}>{ok ? "✓" : "✗"}</span>
                    <span className={ok ? "text-gray-600" : "text-gray-400"}>{label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
