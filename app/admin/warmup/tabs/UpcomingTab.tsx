"use client";
import { useState } from "react";
import Link from "next/link";
import { fmtDate, DOMAIN_LABEL, DOMAIN_COLOR } from "@/lib/leadUtils";
import type { UpcomingBatch, BatchLead } from "../types";

export function UpcomingTab({ batches, loading, days }: { batches: UpcomingBatch[]; loading: boolean; days: number }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(batches[0]?.id ?? null);

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;
  if (batches.length === 0) return (
    <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
      <p className="font-medium">No upcoming batches in the next {days} days</p>
    </div>
  );

  const allLeads = batches.flatMap(b => b.leads);
  const byDomain: Record<string, number> = {};
  for (const bl of allLeads) byDomain[bl.lead.domain] = (byDomain[bl.lead.domain] ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="text-sm font-medium text-gray-700">{batches.length} days · {allLeads.length} leads</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byDomain).map(([domain, count]) => (
            <span key={domain} className={`text-xs px-2.5 py-1 rounded-full font-medium ${DOMAIN_COLOR[domain] ?? "bg-gray-100 text-gray-600"}`}>
              {DOMAIN_LABEL[domain] ?? domain}: {count}
            </span>
          ))}
        </div>
      </div>

      {batches.map(batch => {
        const isOpen = expandedDay === batch.id;
        const domainGroups: Record<string, BatchLead[]> = {};
        for (const bl of batch.leads) {
          if (!domainGroups[bl.lead.domain]) domainGroups[bl.lead.domain] = [];
          domainGroups[bl.lead.domain].push(bl);
        }
        return (
          <div key={batch.id} className="bg-white border rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition text-left" onClick={() => setExpandedDay(isOpen ? null : batch.id)}>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm text-blue-700">Day {batch.dayNumber}</span>
                <span className="text-gray-500 text-sm">{fmtDate(batch.date)}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{batch.quota} emails</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {Object.entries(domainGroups).map(([domain, leads]) => (
                  <span key={domain} className={`px-2 py-0.5 rounded-full font-medium ${DOMAIN_COLOR[domain] ?? "bg-gray-100 text-gray-600"}`}>
                    {DOMAIN_LABEL[domain] ?? domain} ×{leads.length}
                  </span>
                ))}
                <span className="text-gray-400 ml-1">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">#</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Segment</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Location</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Phone</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Website</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {batch.leads.map((bl, idx) => (
                      <tr key={bl.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5"><Link href={`/leads/${bl.lead.id}`} className="text-blue-700 hover:underline font-medium text-xs">{bl.lead.name}</Link></td>
                        <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DOMAIN_COLOR[bl.lead.domain] ?? "bg-gray-100 text-gray-600"}`}>{DOMAIN_LABEL[bl.lead.domain] ?? bl.lead.domain}</span></td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{[bl.lead.city, bl.lead.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{bl.lead.phone ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs max-w-[140px] truncate">
                          {bl.lead.website ? <a href={bl.lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{bl.lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{bl.lead.rating ?? "—"}</td>
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
