"use client";
import { useState } from "react";
import Link from "next/link";
import { DOMAIN_LABEL, DOMAIN_COLOR } from "@/lib/leadUtils";
import type { BatchSummary, BatchLead } from "../types";
import { WARMUP_SCHEDULE } from "../constants";
import { getWarmupBatch } from "../api";
import { WarmupStatusBadge } from "../components/LeadRow";

export function MonthPlanTab({ batches }: { batches: BatchSummary[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [batchLeads, setBatchLeads] = useState<Record<number, BatchLead[]>>({});
  const [batchLoading, setBatchLoading] = useState<Record<number, boolean>>({});

  async function toggleDay(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (batchLeads[id]) return;
    setBatchLoading(p => ({ ...p, [id]: true }));
    const data = await getWarmupBatch(id);
    setBatchLeads(p => ({ ...p, [id]: data.batch?.leads ?? [] }));
    setBatchLoading(p => ({ ...p, [id]: false }));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Warmup Schedule</h3>
        <div className="grid grid-cols-5 gap-2">
          {WARMUP_SCHEDULE.map(row => (
            <div key={row.range} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{row.range}</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{row.quota}</p>
              <p className="text-xs text-gray-400">emails/day</p>
              <p className="text-xs text-gray-400 mt-0.5">{row.perDomain}/domain</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">30-Day Grid — click a day to see leads</h3>
        <div className="grid grid-cols-6 gap-2">
          {batches.map(b => {
            const allSent = b.isPast && b.sent === b.quota;
            const partial = b.isPast && b.sent > 0 && b.sent < b.quota;
            const missed  = b.isPast && b.sent === 0;
            const isExp   = expandedId === b.id;

            let cellClass = "border rounded-lg p-2 text-center cursor-pointer transition-all hover:shadow-md ";
            if (b.isToday)  cellClass += "border-blue-500 bg-blue-50";
            else if (allSent) cellClass += "border-green-200 bg-green-50";
            else if (partial) cellClass += "border-yellow-200 bg-yellow-50";
            else if (missed)  cellClass += "border-red-100 bg-red-50";
            else              cellClass += "border-gray-100 bg-gray-50 hover:bg-blue-50";

            return (
              <div key={b.id} className={cellClass} onClick={() => toggleDay(b.id)}>
                <p className={`text-xs font-semibold ${b.isToday ? "text-blue-700" : "text-gray-500"}`}>
                  Day {b.dayNumber}{b.isToday && <span className="ml-1 text-blue-500">●</span>}
                </p>
                <p className="text-xs text-gray-400">{new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <p className="text-base font-bold mt-1">{b.quota}</p>
                {(b.isPast || b.isToday) ? (
                  <p className="text-xs mt-0.5">
                    <span className="text-green-600 font-medium">{b.sent}</span>
                    <span className="text-gray-400">/{b.quota}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 mt-0.5">—</p>
                )}
                <p className="text-xs text-blue-400 mt-1">{isExp ? "▲" : "▼"}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">90-Day Delivery Schedule</h3>
          <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {batches.map(b => {
              const allSent = b.isPast && b.sent === b.quota;
              const partial = b.isPast && b.sent > 0 && b.sent < b.quota;
              const missed  = b.isPast && b.sent === 0;
              const isExp   = expandedId === b.id;

              let cellClass = "border rounded-lg p-1.5 text-center cursor-pointer transition-all hover:shadow-md ";
              if (b.isToday)  cellClass += "border-blue-500 bg-blue-50 ring-1 ring-blue-500";
              else if (allSent) cellClass += "border-green-200 bg-green-50";
              else if (partial) cellClass += "border-yellow-200 bg-yellow-50";
              else if (missed)  cellClass += "border-red-100 bg-red-50";
              else              cellClass += "border-gray-100 bg-gray-50 hover:bg-blue-50";

              return (
                <div key={b.id} className={cellClass} onClick={() => toggleDay(b.id)}>
                  <p className={`text-[10px] font-semibold leading-tight ${b.isToday ? "text-blue-700" : "text-gray-500"}`}>
                    D{b.dayNumber}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                  <div className="flex flex-col items-center mt-1">
                    <span className="text-xs font-bold">{b.quota}</span>
                    {(b.isPast || b.isToday) ? (
                      <span className="text-[10px] text-green-600 font-medium">{b.sent}/{b.quota}</span>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </div>
                  <p className="text-[10px] text-blue-400">{isExp ? "▲" : "▼"}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-400 inline-block" />Today</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" />All sent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-100 inline-block" />Missed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" />Upcoming</span>
        </div>
      </div>

      {expandedId !== null && (() => {
        const b = batches.find(x => x.id === expandedId);
        const leads = batchLeads[expandedId] ?? [];
        const loading = batchLoading[expandedId];
        if (!b) return null;
        return (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">Day {b.dayNumber}</span>
                <span className="text-gray-500 text-sm">{new Date(b.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{b.quota} emails</span>
                {b.isPast && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{b.sent} sent · {b.skipped} skipped</span>}
              </div>
              <button onClick={() => setExpandedId(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            {loading ? (
              <p className="text-gray-400 text-sm px-5 py-6 text-center">Loading leads…</p>
            ) : leads.length === 0 ? (
              <p className="text-gray-400 text-sm px-5 py-6 text-center">No leads assigned to this day.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">#</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Segment</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Location</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Phone</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Website</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Rating</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Warmup Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((bl, idx) => (
                      <tr key={bl.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/leads/${bl.lead.id}`} className="text-blue-700 hover:underline font-medium">{bl.lead.name}</Link>
                          {bl.lead.category && <p className="text-gray-400 truncate max-w-[160px]">{bl.lead.category}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded font-medium ${DOMAIN_COLOR[bl.lead.domain] ?? "bg-gray-100 text-gray-600"}`}>
                            {DOMAIN_LABEL[bl.lead.domain] ?? bl.lead.domain}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{[bl.lead.city, bl.lead.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500">{bl.lead.phone || "—"}</td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate">
                          {bl.lead.website
                            ? <a href={bl.lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{bl.lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{bl.lead.rating ?? "—"}</td>
                        <td className="px-4 py-2.5"><WarmupStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
