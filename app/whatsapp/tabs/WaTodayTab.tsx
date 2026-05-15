"use client";
import { useState } from "react";
import Pagination from "@/components/ui/Pagination";
import WaLeadRow from "../components/WaLeadRow";
import type { WaTodayBatch } from "../types";

export function WaTodayTab({ batch, loading, updating, onStatus, showAdvanceModal, advancing, onOpenModal, onAdvance, onCloseModal, page, setPage }: {
  batch: WaTodayBatch | null; loading: boolean;
  updating: Record<number, boolean>; onStatus: (id: number, s: string) => void;
  showAdvanceModal: boolean; advancing: boolean;
  onOpenModal: () => void; onAdvance: () => void; onCloseModal: () => void;
  page: number; setPage: (p: number) => void;
}) {
  const PAGE_SIZE = (() => { const s = typeof window !== "undefined" ? localStorage.getItem("warmup_pageSize") : null; return s && parseInt(s) !== 10 ? parseInt(s) : 15; })();
  const [filters, setFilters] = useState({ name: "", category: "", location: "", phone: "", rating: "", status: "" });
  const setFilter = (key: keyof typeof filters, val: string) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  const AdvanceModal = ({ title, body }: { title: string; body: string }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        <div className="text-4xl">{title === "All done!" ? "🎉" : "⏭"}</div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-500 text-sm">{body}</p>
        <div className="flex gap-3 justify-center pt-2">
          <button onClick={onCloseModal} className="px-5 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onAdvance} disabled={advancing} className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
            {advancing ? "Advancing…" : "Yes, next day →"}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;

  if (!batch) return (
    <>
      {showAdvanceModal && <AdvanceModal title="Skip to next day?" body="No leads are scheduled for today. Advance the campaign?" />}
      <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-1">No leads scheduled for today</p>
        <p className="text-sm mb-4">Check your start date or view the 30-Day Plan tab.</p>
        <button onClick={onOpenModal} className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
          Skip to next day →
        </button>
      </div>
    </>
  );

  const allDone = batch.leads.length > 0 && batch.leads.every(l => l.status !== "PENDING");

  const sent     = batch.leads.filter(l => l.status === "SENT").length;
  const noAnswer = batch.leads.filter(l => l.status === "NO_ANSWER").length;
  const replied  = batch.leads.filter(l => l.status === "REPLIED").length;
  const skipped  = batch.leads.filter(l => l.status === "SKIPPED").length;
  const pending  = batch.leads.filter(l => l.status === "PENDING").length;

  const sortedLeads = [...batch.leads].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, NO_ANSWER: 1, SENT: 2, REPLIED: 3, SKIPPED: 4 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  });

  const q = (s: string) => s.toLowerCase();
  const filteredLeads = sortedLeads.filter(bl => {
    const l = bl.lead;
    const loc = [l.city, l.country].filter(Boolean).join(", ");
    return (
      (!filters.name     || q(l.name).includes(q(filters.name))) &&
      (!filters.category || q(l.category ?? "").includes(q(filters.category))) &&
      (!filters.location || q(loc).includes(q(filters.location))) &&
      (!filters.phone    || (l.phone ?? "").includes(filters.phone)) &&
      (!filters.rating   || (l.rating ?? "").includes(filters.rating)) &&
      (!filters.status   || bl.status === filters.status)
    );
  });

  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  const paginated  = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {showAdvanceModal && (
        <AdvanceModal title="All done!" body={`All ${batch.leads.length} leads processed. Advance to the next day?`} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm flex-wrap">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✓ {sent} sent</span>
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">↩ {replied} replied</span>
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">— {noAnswer} no answer</span>
          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full font-medium">✕ {skipped} skipped</span>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">○ {pending} pending</span>
        </div>
        {allDone && (
          <button onClick={onOpenModal} className="bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 font-medium transition">
            Go to next day →
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Actions</th>
              <th className="sticky right-0 bg-gray-50 px-4 py-3 font-medium text-gray-600 text-xs text-center border-l">Send / Skip</th>
            </tr>
            <tr className="bg-white border-b">
              <td />
              <td className="px-2 py-1.5">
                <input value={filters.name} onChange={e => setFilter("name", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
              </td>
              <td className="px-2 py-1.5">
                <input value={filters.category} onChange={e => setFilter("category", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
              </td>
              <td className="px-2 py-1.5">
                <input value={filters.location} onChange={e => setFilter("location", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
              </td>
              <td className="px-2 py-1.5">
                <input value={filters.phone} onChange={e => setFilter("phone", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
              </td>
              <td className="px-2 py-1.5">
                <input value={filters.rating} onChange={e => setFilter("rating", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
              </td>
              <td className="px-2 py-1.5">
                <select value={filters.status} onChange={e => setFilter("status", e.target.value)} className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400 bg-white">
                  <option value="">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="SENT">Sent</option>
                  <option value="NO_ANSWER">No Answer</option>
                  <option value="REPLIED">Replied</option>
                  <option value="SKIPPED">Skipped</option>
                </select>
              </td>
              <td />
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((bl, idx) => (
              <WaLeadRow
                key={bl.id}
                index={(page - 1) * PAGE_SIZE + idx + 1}
                bl={bl}
                busy={!!updating[bl.id]}
                onStatus={onStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} accent="green" />
    </div>
  );
}
