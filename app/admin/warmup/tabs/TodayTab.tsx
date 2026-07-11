"use client";
import { useState } from "react";
import Pagination from "@/components/ui/Pagination";
import LeadRow from "../components/LeadRow";
import type { TodayBatch, Template, LhScore } from "../types";

export function TodayTab({ batch, loading, updating, onStatus, templates, showAdvanceModal, advancing, onOpenModal, onAdvance, onCloseModal, page, setPage, lhScores, lhScanning, lhProgress, onRunLhScan, repScanning, repProgress, onRunReportScan, expectedPhase, isComplete, onStartNewMonth, startingNext, onLoadMore, loadingMore }: {
  batch: TodayBatch | null; loading: boolean;
  updating: Record<number, boolean>; onStatus: (id: number, s: string) => void;
  templates: Template[]; showAdvanceModal: boolean; advancing: boolean;
  onOpenModal: () => void; onAdvance: () => void; onCloseModal: () => void;
  page: number; setPage: (p: number) => void;
  lhScores: Record<number, LhScore | null>;
  lhScanning: boolean; lhProgress: { done: number; total: number };
  onRunLhScan: () => void;
  repScanning: boolean; repProgress: { done: number; total: number };
  onRunReportScan: () => void;
  expectedPhase: number;
  isComplete?: boolean;
  onStartNewMonth?: () => void;
  startingNext?: boolean;
  onLoadMore?: (limit: number) => void;
  loadingMore?: boolean;
}) {
  const PAGE_SIZE = expectedPhase === 6
    ? 100
    : (() => { const s = typeof window !== "undefined" ? localStorage.getItem("warmup_pageSize") : null; return s ? parseInt(s) : 25; })();
  const [showPhone, setShowPhone] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<string>("");

  const allDone = !!batch && batch.leads.length > 0 &&
    batch.leads.every(l => l.status === "SENT" || l.status === "SKIPPED");

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;
  if (!batch) return (
    <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
      {isComplete ? (
        <>
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-lg font-medium text-gray-700 mb-1">Month 1 complete!</p>
          <p className="text-sm text-gray-400 mb-5">All days have been sent. Ready to start Month 2?</p>
          {onStartNewMonth && (
            <button
              onClick={onStartNewMonth}
              disabled={startingNext}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {startingNext ? "Creating plan…" : "🚀 Start Month 2 →"}
            </button>
          )}
        </>
      ) : (
        <>
          {showAdvanceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
                <div className="text-4xl">⏭</div>
                <h2 className="text-xl font-bold text-gray-800">Skip to next day?</h2>
                <p className="text-gray-500 text-sm">No leads are scheduled for today. Advance the plan to the next day?</p>
                <div className="flex gap-3 justify-center pt-2">
                  <button onClick={onCloseModal} className="px-5 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={onAdvance} disabled={advancing} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                    {advancing ? "Advancing…" : "Yes, next day →"}
                  </button>
                </div>
              </div>
            </div>
          )}
          <p className="text-lg font-medium mb-1">No leads scheduled for today</p>
          <p className="text-sm mb-4">Check back on your plan start date or view the Month Plan tab.</p>
          <button onClick={onOpenModal} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            Skip to next day →
          </button>
        </>
      )}
    </div>
  );

  const sent    = batch.leads.filter(l => l.status === "SENT").length;
  const skipped = batch.leads.filter(l => l.status === "SKIPPED").length;
  const pending = batch.leads.filter(l => l.status === "PENDING").length;
  const wrongPhase = batch.leads.filter(l => l.lead.phase !== expectedPhase);
  // Unique segments from batch for filter pills
  const segments = Array.from(new Set(batch.leads.map(bl => bl.lead.domain ?? ""))).filter(Boolean).sort();

  const sortedLeads = [...batch.leads]
    .filter(bl => !segmentFilter || bl.lead.domain === segmentFilter)
    .sort((a, b) => {
      const order: Record<string, number> = { PENDING: 0, SKIPPED: 1, SENT: 2 };
      return (order[a.status] ?? 0) - (order[b.status] ?? 0);
    });
  const totalPages = Math.ceil(sortedLeads.length / PAGE_SIZE);
  const paginated  = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-bold text-gray-800">All done for today!</h2>
            <p className="text-gray-500 text-sm">
              All {batch.leads.length} leads have been sent or skipped.<br />
              Do you want to advance to the next day now?
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={onCloseModal} className="px-5 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Not yet</button>
              <button onClick={onAdvance} disabled={advancing} className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {advancing ? "Advancing…" : "Yes, next day →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={onRunLhScan}
          disabled={lhScanning || repScanning}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          {lhScanning ? `Scanning… ${lhProgress.done}/${lhProgress.total}` : "Update Lighthouse Scores"}
        </button>
        {lhScanning && (
          <div className="w-32">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: lhProgress.total > 0 ? `${Math.round((lhProgress.done / lhProgress.total) * 100)}%` : "0%" }} />
            </div>
          </div>
        )}
        <button
          onClick={onRunReportScan}
          disabled={repScanning || lhScanning}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          {repScanning ? `Scanning… ${repProgress.done}/${repProgress.total}` : "Update Full Reports"}
        </button>
        {repScanning && (
          <div className="w-32">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: repProgress.total > 0 ? `${Math.round((repProgress.done / repProgress.total) * 100)}%` : "0%" }} />
            </div>
          </div>
        )}
      </div>

      {wrongPhase.length > 0 ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-2.5 text-sm text-red-700 font-medium">
          ⚠️ {wrongPhase.length} lead{wrongPhase.length > 1 ? "s" : ""} in this batch are from a different phase (not Phase {expectedPhase}):&nbsp;
          {wrongPhase.map(bl => <span key={bl.id} className="underline">{bl.lead.name}</span>).reduce<React.ReactNode[]>((a, el, i) => i === 0 ? [el] : [...a, ", ", el], [])}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700 font-medium">
          ✓ All {batch.leads.length} leads are Phase {expectedPhase}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✓ {sent} sent</span>
          <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">⏭ {skipped} skipped</span>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">○ {pending} pending</span>
        </div>
        {allDone && (
          <button onClick={onOpenModal} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 font-medium transition">
            Go to next day →
          </button>
        )}
      </div>

      {segments.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-gray-400 text-xs font-medium">Segment:</span>
          <button
            onClick={() => { setSegmentFilter(""); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${!segmentFilter ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All ({batch.leads.length})
          </button>
          {segments.map(seg => {
            const count = batch.leads.filter(bl => bl.lead.domain === seg).length;
            return (
              <button key={seg}
                onClick={() => { setSegmentFilter(seg); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${segmentFilter === seg ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {seg} ({count})
              </button>
            );
          })}
        </div>
      )}

      {onLoadMore && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 text-xs font-medium">Load more from upcoming days:</span>
          {[50, 100, 200].map(n => (
            <button key={n} onClick={() => { onLoadMore(n); setPage(1); }} disabled={loadingMore}
              className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition">
              {loadingMore ? "Loading…" : `+${n}`}
            </button>
          ))}
          <span className="text-gray-300 text-xs">({batch.leads.length} loaded)</span>
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Segment</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                {showPhone
                  ? <span className="flex items-center gap-1">Phone <button onClick={() => setShowPhone(false)} className="text-gray-300 hover:text-red-400 text-xs font-normal leading-none" title="Hide phone">×</button></span>
                  : <button onClick={() => setShowPhone(true)} className="text-gray-300 hover:text-gray-500 text-xs font-normal" title="Show phone column">+📞</button>
                }
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">
                {showAudit
                  ? <span className="flex items-center gap-1">Audit 🔒/🔍/📊 <button onClick={() => setShowAudit(false)} className="text-gray-300 hover:text-red-400 text-xs font-normal leading-none" title="Hide audit">×</button></span>
                  : <button onClick={() => setShowAudit(true)} className="text-gray-300 hover:text-gray-500 text-xs font-normal" title="Show audit column">+🔒</button>
                }
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                {showEmailHistory
                  ? <span className="flex items-center gap-1">Email History <button onClick={() => setShowEmailHistory(false)} className="text-gray-300 hover:text-red-400 text-xs font-normal leading-none" title="Hide email history">×</button></span>
                  : <button onClick={() => setShowEmailHistory(true)} className="text-gray-300 hover:text-gray-500 text-xs font-normal" title="Show email history column">+📧</button>
                }
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Copy / LinkedIn</th>
              <th className="sticky right-0 bg-gray-50 px-4 py-3 font-medium text-gray-600 text-center border-l">Send / Skip</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((bl, idx) => (
              <LeadRow
                key={bl.id}
                index={(page - 1) * PAGE_SIZE + idx + 1}
                bl={bl}
                batchDate={batch.date}
                busy={!!updating[bl.id]}
                onStatus={onStatus}
                templates={templates}
                lhScore={lhScores[bl.lead.id]}
                showPhone={showPhone}
                showAudit={showAudit}
                showEmailHistory={showEmailHistory}
                expectedPhase={expectedPhase}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}
