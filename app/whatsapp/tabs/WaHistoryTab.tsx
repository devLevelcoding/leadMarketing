"use client";
import { useState } from "react";
import Link from "next/link";
import { countryFlag, fmtDate } from "@/lib/leadUtils";
import type { WaHistoryBatch } from "../types";
import { WaStatusBadge } from "../components/WaLeadRow";

export function WaHistoryTab({ batches, loading }: { batches: WaHistoryBatch[]; loading: boolean }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(batches[0]?.id ?? null);

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;
  if (batches.length === 0) return (
    <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
      <p className="font-medium">No history yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {batches.map(batch => {
        const sent     = batch.leads.filter(l => l.status === "SENT").length;
        const noAnswer = batch.leads.filter(l => l.status === "NO_ANSWER").length;
        const replied  = batch.leads.filter(l => l.status === "REPLIED").length;
        const skipped  = batch.leads.filter(l => l.status === "SKIPPED").length;
        const pending  = batch.leads.filter(l => l.status === "PENDING").length;
        const isOpen   = expandedDay === batch.id;

        return (
          <div key={batch.id} className="bg-white border rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition text-left"
              onClick={() => setExpandedDay(isOpen ? null : batch.id)}
            >
              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm">Day {batch.dayNumber}</span>
                <span className="text-gray-400 text-sm">{fmtDate(batch.date)}</span>
                <span className="text-xs text-gray-400">{batch.quota} quota</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{sent} sent</span>
                {replied  > 0 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{replied} replied</span>}
                {noAnswer > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{noAnswer} no answer</span>}
                {skipped  > 0 && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{skipped} skipped</span>}
                {pending  > 0 && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{pending} pending</span>}
                <span className="text-gray-400 ml-2">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Category</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Location</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Phone</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {batch.leads.map(bl => (
                      <tr key={bl.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/leads/${bl.lead.id}`} className="text-blue-700 hover:underline font-medium text-xs">{bl.lead.name}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{bl.lead.category || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            {bl.lead.country && <span>{countryFlag(bl.lead.country)}</span>}
                            <span>{[bl.lead.city, bl.lead.country].filter(Boolean).join(", ") || "—"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{bl.lead.phone || "—"}</td>
                        <td className="px-4 py-2.5"><WaStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">
                          {bl.sentAt ? new Date(bl.sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
