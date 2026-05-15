"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import FullReportModal from "@/app/components/FullReportModal";
import CopyPhoneButton from "@/components/ui/CopyPhoneButton";
import { countryFlag, fmtDate, DOMAIN_LABEL, DOMAIN_COLOR } from "@/lib/leadUtils";
import type { BatchLead, Lead, Template, LhScore, FullScan, LeadReport } from "../types";
import { getLeadLighthouse, getLeadReport } from "../api";
import { buildEmail, buildLeadCopyText, buildReportSection, interpolate } from "../builders";

export function WarmupStatusBadge({ status, sentAt }: { status: string; sentAt: string | null }) {
  if (status === "SENT") {
    const time = sentAt ? new Date(sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    const date = sentAt ? fmtDate(sentAt) : "";
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Sent {date} {time}</span>;
  }
  if (status === "SKIPPED") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Skipped</span>;
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Pending</span>;
}

export function emailStatusColor(status: string): string {
  switch (status) {
    case "SENT":    return "bg-blue-100 text-blue-700";
    case "OPENED":  return "bg-green-100 text-green-700";
    case "REPLIED": return "bg-purple-100 text-purple-700";
    case "BOUNCED": return "bg-red-100 text-red-600";
    default:        return "bg-gray-100 text-gray-500";
  }
}

export function CopyButton({ lead, templates }: { lead: Lead; templates: Template[] }) {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const relevant = [...templates.filter(t => t.domain === lead.domain), ...templates.filter(t => t.domain === null)];

  function copy(tpl: Template) {
    navigator.clipboard.writeText(`Subject: ${interpolate(tpl.subject, lead)}\n\n${interpolate(tpl.body, lead)}`);
    setCopiedId(tpl.id);
    setTimeout(() => { setCopiedId(null); setOpen(false); }, 1500);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded hover:bg-indigo-200 transition font-medium">Copy Email</button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border rounded-xl shadow-xl w-60 py-1 text-left">
          <p className="px-3 pt-1.5 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pick template</p>
          {relevant.length === 0 ? <p className="px-3 py-2 text-xs text-gray-400">No templates found</p> : relevant.map(tpl => (
            <button key={tpl.id} onClick={() => copy(tpl)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800 leading-snug">{tpl.name}</span>
              {copiedId === tpl.id ? <span className="text-green-600 font-semibold shrink-0">Copied!</span> : <span className="text-gray-400 shrink-0">{tpl.domain ? DOMAIN_LABEL[tpl.domain] ?? tpl.domain : "generic"}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GenerateEmailButton({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { subject, body } = buildEmail(lead);

  function copyAll() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded hover:bg-blue-200 transition font-medium"
      >
        Generate Email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Email Draft — {lead.name}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Subject</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">{subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Body</p>
                <pre className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap font-sans">{body}</pre>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition">Close</button>
              <button onClick={copyAll} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                {copied ? "Copied!" : "Copy Full Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CopyLeadButton({ lead, batchDate }: { lead: Lead; batchDate: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const text = buildLeadCopyText(lead, batchDate, null);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded hover:bg-green-200 transition font-medium"
    >
      {copied ? "Copied!" : "Copy Lead"}
    </button>
  );
}

export function CopyLeadDataButton({ lead, batchDate }: { lead: Lead; batchDate: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  async function copyData() {
    setState("loading");
    let scan: FullScan | null = null;
    let report: LeadReport | null = null;

    if (lead.website) {
      try {
        const [lhRes, repRes] = await Promise.all([
          getLeadLighthouse(lead.id),
          getLeadReport(lead.id),
        ]);
        scan   = lhRes.scan   ?? null;
        report = repRes.report ?? null;
      } catch { /* proceed without */ }
    }

    let text = buildLeadCopyText(lead, batchDate, scan);
    if (report) text += buildReportSection(report);
    await navigator.clipboard.writeText(text);
    setState("copied");
    setTimeout(() => setState("idle"), 1800);
  }

  const label =
    state === "copied"  ? "Copied!" :
    state === "loading" ? "…" :
    "Copy Report";

  return (
    <button
      onClick={copyData}
      disabled={state === "loading"}
      className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded hover:bg-purple-200 disabled:opacity-50 transition font-medium"
    >
      {label}
    </button>
  );
}

export default function LeadRow({ index, bl, batchDate, busy, onStatus, templates, lhScore, showPhone, showAudit, showEmailHistory }: {
  index: number; bl: BatchLead; batchDate: string;
  busy: boolean; onStatus: (id: number, s: string) => void; templates: Template[];
  lhScore?: LhScore | null; showPhone?: boolean; showAudit?: boolean; showEmailHistory?: boolean;
}) {
  const lead = bl.lead;
  const lastLog = lead.emailLogs[0];
  const [showReport, setShowReport] = useState(false);
  const rowBg =
    bl.status === "SENT"    ? "bg-green-50 hover:bg-green-100" :
    bl.status === "SKIPPED" ? "bg-yellow-50 hover:bg-yellow-100" :
                              "hover:bg-blue-50";

  return (
    <tr className={`transition-colors ${rowBg}`}>
      <td className="px-4 py-3 text-gray-400 text-xs">{index}</td>
      <td className="px-4 py-3">
        <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline">{lead.name}</Link>
        {lead.category && <p className="text-xs text-gray-400 truncate max-w-[160px]">{lead.category}</p>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${DOMAIN_COLOR[lead.domain] ?? "bg-gray-100 text-gray-600"}`}>
          {DOMAIN_LABEL[lead.domain] ?? lead.domain}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-xs">
        <span className="flex items-center gap-1">
          {lead.country && <span className="text-base leading-none">{countryFlag(lead.country)}</span>}
          <span>{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</span>
        </span>
      </td>
      {showPhone && <td className="px-4 py-3 text-gray-600 text-xs">
        <div className="flex items-center gap-1.5">
          <span>{lead.phone || "—"}</span>
          {lead.phone && !lead.website && (
            <a
              href={`https://wa.me/${lead.phone.replace(/[\s\-().]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              title="Send WhatsApp message"
              className="text-green-500 hover:text-green-600 transition flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
            </a>
          )}
        </div>
      </td>}
      <td className="px-4 py-3 text-xs max-w-[140px] truncate">
        {lead.website
          ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
          : <span className="text-gray-300">—</span>}
      </td>
      {showAudit && <td className="px-4 py-3 text-xs">
        {lhScore === undefined && lead.website
          ? <span className="text-gray-300 text-xs">…</span>
          : lhScore
            ? <span className="flex items-center gap-1 font-mono text-xs">
                <span className={lhScore.sec >= 70 ? "text-green-600 font-bold" : lhScore.sec >= 40 ? "text-yellow-600 font-bold" : "text-red-500 font-bold"}>{lhScore.sec}</span>
                <span className="text-gray-300">/</span>
                <span className={lhScore.seo >= 70 ? "text-green-600 font-bold" : lhScore.seo >= 40 ? "text-yellow-600 font-bold" : "text-red-500 font-bold"}>{lhScore.seo}</span>
                <span className="text-gray-300">/</span>
                <span className={lhScore.sem >= 70 ? "text-green-600 font-bold" : lhScore.sem >= 40 ? "text-yellow-600 font-bold" : "text-red-500 font-bold"}>{lhScore.sem}</span>
              </span>
            : <span className="text-gray-300">—</span>}
      </td>}
      {showEmailHistory && <td className="px-4 py-3 text-xs">
        {lastLog ? (
          <div>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${emailStatusColor(lastLog.status)}`}>{lastLog.status}</span>
            <span className="text-gray-400 ml-1">{fmtDate(lastLog.sentAt)}</span>
            {lead.emailLogs.length > 1 && <span className="text-gray-400 ml-1">+{lead.emailLogs.length - 1} more</span>}
          </div>
        ) : <span className="text-gray-300">No history</span>}
      </td>}
      <td className="px-4 py-3"><WarmupStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          <CopyLeadButton lead={lead} batchDate={batchDate} />
          <CopyLeadDataButton lead={lead} batchDate={batchDate} />
          {lead.phone && !lead.website && (
            <CopyPhoneButton phone={lead.phone} />
          )}
          <a
            href={`https://www.google.com/search?q=site:linkedin.com/in+"${encodeURIComponent(lead.name)}"${lead.city ? `+"${encodeURIComponent(lead.city)}"` : ""}+owner+OR+founder+OR+manager+OR+director`}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 transition font-medium"
            title="Find decision maker on LinkedIn"
          >
            LinkedIn
          </a>
        </div>
        {showReport && (
          <FullReportModal
            leadId={lead.id}
            leadName={lead.name}
            website={lead.website ?? null}
            onClose={() => setShowReport(false)}
          />
        )}
      </td>
      <td className="sticky right-0 bg-white border-l px-3 py-3 text-center">
        {bl.status === "PENDING" && (
          <div className="flex flex-col gap-1.5">
            <button disabled={busy} onClick={() => onStatus(bl.id, "SENT")} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-40 transition font-medium w-full">✓ Sent</button>
            <button disabled={busy} onClick={() => onStatus(bl.id, "SKIPPED")} className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1.5 rounded hover:bg-yellow-200 disabled:opacity-40 transition font-medium w-full">⏭ Skip</button>
          </div>
        )}
        {(bl.status === "SENT" || bl.status === "SKIPPED") && (
          <button disabled={busy} onClick={() => onStatus(bl.id, "PENDING")} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition w-full">↩ Undo</button>
        )}
      </td>
    </tr>
  );
}
