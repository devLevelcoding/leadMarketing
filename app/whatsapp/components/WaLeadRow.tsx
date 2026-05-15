"use client";
import { useState } from "react";
import Link from "next/link";
import CopyPhoneButton from "@/components/ui/CopyPhoneButton";
import { countryFlag } from "@/lib/leadUtils";
import type { WaBatchLead, Lead } from "../types";
import { cleanPhone, buildWaMessage } from "../builders";

export function WaStatusBadge({ status, sentAt }: { status: string; sentAt: string | null }) {
  const time = sentAt ? new Date(sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  if (status === "REPLIED")   return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Replied {time}</span>;
  if (status === "SENT")      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Sent {time}</span>;
  if (status === "NO_ANSWER") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">No Answer {time}</span>;
  if (status === "SKIPPED")   return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Skipped {time}</span>;
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Pending</span>;
}

export function WaCopyLeadButton({ lead }: { lead: Lead }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const lines = [
      `Business: ${lead.name}`,
      lead.category  ? `Category: ${lead.category}` : null,
      [lead.city, lead.country].filter(Boolean).length
        ? `Location: ${[lead.city, lead.country].filter(Boolean).join(", ")}`
        : null,
      lead.phone  ? `Phone: ${lead.phone}` : null,
      lead.rating ? `Rating: ${lead.rating}` : null,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded hover:bg-indigo-200 transition font-medium"
    >
      {copied ? "Copied!" : "Copy Lead"}
    </button>
  );
}

export function WaMessageButton({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = buildWaMessage(lead);

  function copyMessage() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded hover:bg-green-200 transition font-medium"
      >
        Message
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-500">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
                <h2 className="font-bold text-gray-800">WA Message — {lead.name}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <pre className="text-sm text-gray-800 bg-gray-50 rounded-lg px-4 py-3 whitespace-pre-wrap font-sans">{message}</pre>
            </div>
            <div className="px-6 py-4 border-t flex justify-between items-center gap-2">
              {lead.phone && (
                <a
                  href={`https://wa.me/${cleanPhone(lead.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                  </svg>
                  Open in WhatsApp
                </a>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition">Close</button>
                <button onClick={copyMessage} className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition">
                  {copied ? "Copied!" : "Copy Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WaLeadRow({ index, bl, busy, onStatus }: {
  index: number; bl: WaBatchLead;
  busy: boolean; onStatus: (id: number, s: string) => void;
}) {
  const lead = bl.lead;
  const rowBg =
    bl.status === "REPLIED"   ? "bg-purple-50 hover:bg-purple-100" :
    bl.status === "SENT"      ? "bg-green-50 hover:bg-green-100" :
    bl.status === "NO_ANSWER" ? "bg-yellow-50 hover:bg-yellow-100" :
    bl.status === "SKIPPED"   ? "bg-red-50 hover:bg-red-100" :
                                "hover:bg-green-50";

  return (
    <tr className={`transition-colors ${rowBg}`}>
      <td className="px-4 py-3 text-gray-400 text-xs">{index}</td>
      <td className="px-4 py-3">
        <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline text-sm">{lead.name}</Link>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{lead.category || "—"}</td>
      <td className="px-4 py-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          {lead.country && <span className="text-base leading-none">{countryFlag(lead.country)}</span>}
          <span>{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="flex items-center gap-1.5">
          {lead.phone ? (
            <>
              <a href={`tel:${cleanPhone(lead.phone)}`} className="text-gray-600 hover:text-blue-600 transition">{lead.phone}</a>
              <a
                href={`https://wa.me/${cleanPhone(lead.phone)}`}
                target="_blank"
                rel="noreferrer"
                title="Open in WhatsApp"
                className="text-green-500 hover:text-green-600 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
              </a>
            </>
          ) : <span className="text-gray-300">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{lead.rating ?? "—"}</td>
      <td className="px-4 py-3"><WaStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          {lead.phone && <WaMessageButton lead={lead} />}
          <WaCopyLeadButton lead={lead} />
          {lead.phone && <CopyPhoneButton phone={lead.phone} />}
        </div>
      </td>
      <td className="sticky right-0 bg-white border-l px-3 py-3 text-center">
        {bl.status === "PENDING" && (
          <div className="flex flex-col gap-1.5">
            <button disabled={busy} onClick={() => onStatus(bl.id, "SENT")}
              className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-40 transition font-medium w-full">
              ✓ Sent
            </button>
            <button disabled={busy} onClick={() => onStatus(bl.id, "NO_ANSWER")}
              className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1.5 rounded hover:bg-yellow-200 disabled:opacity-40 transition font-medium w-full">
              No Answer
            </button>
            <button disabled={busy} onClick={() => onStatus(bl.id, "SKIPPED")}
              className="bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded hover:bg-red-200 disabled:opacity-40 transition font-medium w-full"
              title="Phone not working / wrong number">
              ⏭ Skip
            </button>
          </div>
        )}
        {bl.status === "SENT" && (
          <div className="flex flex-col gap-1.5">
            <button disabled={busy} onClick={() => onStatus(bl.id, "REPLIED")}
              className="bg-purple-100 text-purple-700 text-xs px-3 py-1.5 rounded hover:bg-purple-200 disabled:opacity-40 transition font-medium w-full">
              💬 Replied
            </button>
            <button disabled={busy} onClick={() => onStatus(bl.id, "PENDING")}
              className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition w-full">
              ↩ Undo
            </button>
          </div>
        )}
        {(bl.status === "NO_ANSWER" || bl.status === "SKIPPED" || bl.status === "REPLIED") && (
          <button disabled={busy} onClick={() => onStatus(bl.id, "PENDING")}
            className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition w-full">
            ↩ Undo
          </button>
        )}
      </td>
    </tr>
  );
}
