"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { fmtDate, DOMAIN_LABEL, DOMAIN_COLOR } from "@/lib/leadUtils";
import type { HistoryBatch } from "../types";
import { WarmupStatusBadge } from "../components/LeadRow";

export function HistoryTab({ batches, loading }: { batches: HistoryBatch[]; loading: boolean }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(batches[0]?.id ?? null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return batches;
    return batches
      .map(batch => ({
        ...batch,
        leads: batch.leads.filter(bl => bl.lead.name.toLowerCase().includes(query)),
      }))
      .filter(batch => batch.leads.length > 0);
  }, [batches, query]);

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;
  if (batches.length === 0) return (
    <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
      <p className="font-medium">No history yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full pl-8 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-400 text-sm">
          No results for &ldquo;{search}&rdquo;
        </div>
      )}

      {filtered.map(batch => {
        const sent    = batch.leads.filter(l => l.status === "SENT").length;
        const skipped = batch.leads.filter(l => l.status === "SKIPPED").length;
        const pending = batch.leads.filter(l => l.status === "PENDING").length;
        const isOpen  = query ? true : expandedDay === batch.id;
        return (
          <div key={batch.id} className="bg-white border rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition text-left" onClick={() => !query && setExpandedDay(isOpen ? null : batch.id)}>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm">Day {batch.dayNumber}</span>
                <span className="text-gray-400 text-sm">{fmtDate(batch.date)}</span>
                <span className="text-xs text-gray-400">{batch.quota} quota</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{sent} sent</span>
                {skipped > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{skipped} skipped</span>}
                {pending > 0 && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{pending} pending</span>}
                {!query && <span className="text-gray-400 ml-2">{isOpen ? "▲" : "▼"}</span>}
              </div>
            </button>
            {isOpen && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Segment</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Location</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {batch.leads.map(bl => (
                      <tr key={bl.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/leads/${bl.lead.id}`} className="text-blue-700 hover:underline font-medium text-xs">
                            {query
                              ? highlightMatch(bl.lead.name, query)
                              : bl.lead.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded font-medium ${DOMAIN_COLOR[bl.lead.domain] ?? "bg-gray-100 text-gray-600"}`}>{DOMAIN_LABEL[bl.lead.domain] ?? bl.lead.domain}</span></td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{[bl.lead.city, bl.lead.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-2.5"><WarmupStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{bl.sentAt ? fmtDate(bl.sentAt) : "—"}</td>
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

function highlightMatch(name: string, query: string) {
  const idx = name.toLowerCase().indexOf(query);
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{name.slice(idx, idx + query.length)}</mark>
      {name.slice(idx + query.length)}
    </>
  );
}
