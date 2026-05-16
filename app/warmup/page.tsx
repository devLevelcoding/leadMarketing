"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import StatBox from "@/components/ui/StatBox";
import { fmtDate } from "@/lib/leadUtils";
import type { PlanStatus, TodayBatch, HistoryBatch, UpcomingBatch, Template, LhScore } from "./types";
import { PHASE_TABS, WARMUP_SCHEDULE } from "./constants";
import { getTemplates, getWarmupPlan, getWarmupToday, getWarmupHistory, getWarmupUpcoming, getLighthouseScores, createWarmupPlan, deleteWarmupPlan, patchWarmupBatchLead, advanceWarmupDay, streamLighthouseScan, streamReportScan } from "./api";
import { TodayTab } from "./tabs/TodayTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { UpcomingTab } from "./tabs/UpcomingTab";
import { MonthPlanTab } from "./tabs/MonthPlanTab";
import { LongTermPlanTab } from "./tabs/LongTermPlanTab";
import { CountryGridTab } from "./tabs/CountryGridTab";
import { InstagramTab } from "./tabs/InstagramTab";

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function WarmupPage() {
  const searchParams = useSearchParams();
  const [activePhase, setActivePhase] = useState(() => {
    const p = searchParams.get("phase");
    return p ? parseInt(p) : 1;
  });
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    getTemplates().then(d => setTemplates(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Email Warmup</h1>
        <p className="text-gray-500 text-sm mt-1">6-month email campaign plan per phase</p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {PHASE_TABS.map(t => (
          <button
            key={t.phase}
            onClick={() => setActivePhase(t.phase)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              activePhase === t.phase
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.flag}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      <PhaseWarmup key={activePhase} phase={activePhase} templates={templates} />
    </div>
  );
}

// ─── Per-Phase Component ──────────────────────────────────────────────────────

function PhaseWarmup({ phase, templates }: { phase: number; templates: Template[] }) {
  const [plan, setPlan]             = useState<PlanStatus | null>(null);
  const [loading, setLoading]       = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [startDate, setStartDate]   = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab]   = useState<"today" | "plan" | "plan90" | "history" | "next5" | "next10" | "countries" | "instagram">("today");

  const [todayBatch, setTodayBatch]     = useState<TodayBatch | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing]       = useState(false);
  const [todayPage, setTodayPage]       = useState(1);
  const [historyBatches, setHistoryBatches] = useState<HistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [upcoming5, setUpcoming5]       = useState<UpcomingBatch[]>([]);
  const [upcoming5Loading, setUpcoming5Loading] = useState(false);
  const [upcoming10, setUpcoming10]     = useState<UpcomingBatch[]>([]);
  const [upcoming10Loading, setUpcoming10Loading] = useState(false);
  const [updating, setUpdating]         = useState<Record<number, boolean>>({});

  const [lhScores,   setLhScores]   = useState<Record<number, LhScore | null>>({});
  const [lhScanning, setLhScanning] = useState(false);
  const [lhProgress, setLhProgress] = useState({ done: 0, total: 0 });
  const [repScanning, setRepScanning] = useState(false);
  const [repProgress, setRepProgress] = useState({ done: 0, total: 0 });

  const fetchLhScores = useCallback(async (leadIds: number[]) => {
    if (!leadIds.length) return;
    const data = await getLighthouseScores(leadIds);
    const map: Record<number, LhScore | null> = {};
    for (const id of leadIds) map[id] = null;
    for (const s of data.scans ?? []) {
      map[s.leadId] = { sec: s.secScore, seo: s.seoScore, sem: s.semScore };
    }
    setLhScores(map);
  }, []);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const data = await getWarmupPlan(phase);
    setPlan(data.plan);
    setLoading(false);
  }, [phase]);

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    const d = await getWarmupToday(phase);
    setTodayBatch(d.batch ?? null);
    setTodayLoading(false);
  }, [phase]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const d = await getWarmupHistory(phase);
    setHistoryBatches(d.batches || []);
    setHistoryLoading(false);
  }, [phase]);

  const fetchUpcoming5 = useCallback(async () => {
    setUpcoming5Loading(true);
    const d = await getWarmupUpcoming(5, phase);
    setUpcoming5(d.batches || []);
    setUpcoming5Loading(false);
  }, [phase]);

  const fetchUpcoming10 = useCallback(async () => {
    setUpcoming10Loading(true);
    const d = await getWarmupUpcoming(10, phase);
    setUpcoming10(d.batches || []);
    setUpcoming10Loading(false);
  }, [phase]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  useEffect(() => {
    if (activeTab === "today")   fetchToday();
    if (activeTab === "history") fetchHistory();
    if (activeTab === "next5")   fetchUpcoming5();
    if (activeTab === "next10")  fetchUpcoming10();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!todayBatch) return;
    const ids = todayBatch.leads.filter(bl => bl.lead.website).map(bl => bl.lead.id);
    fetchLhScores(ids);
  }, [todayBatch, fetchLhScores]);

  async function runLhScan() {
    if (!todayBatch) return;
    const ids = todayBatch.leads.filter(bl => bl.lead.website).map(bl => bl.lead.id);
    if (!ids.length) return;
    setLhScanning(true);
    setLhProgress({ done: 0, total: 0 });
    try {
      await streamLighthouseScan(ids, msg => {
        if (msg.type === "start")    setLhProgress({ done: 0, total: msg.total ?? 0 });
        if (msg.type === "progress") setLhProgress({ done: msg.done ?? 0, total: msg.total ?? 0 });
      });
    } catch (err) { console.error("Lighthouse scan error:", err); }
    finally {
      setLhScanning(false);
      fetchLhScores(todayBatch.leads.filter(bl => bl.lead.website).map(bl => bl.lead.id));
    }
  }

  async function runReportScan() {
    if (!todayBatch) return;
    const ids = todayBatch.leads.filter(bl => bl.lead.website).map(bl => bl.lead.id);
    if (!ids.length) return;
    setRepScanning(true);
    setRepProgress({ done: 0, total: 0 });
    try {
      await streamReportScan(ids, msg => {
        if (msg.type === "start")    setRepProgress({ done: 0, total: msg.total ?? 0 });
        if (msg.type === "progress") setRepProgress({ done: msg.done ?? 0, total: msg.total ?? 0 });
      });
    } catch (err) { console.error("Report scan error:", err); }
    finally { setRepScanning(false); }
  }

  async function initPlan() {
    setInitiating(true);
    const res = await createWarmupPlan(phase, startDate);
    if (res.ok) { await fetchPlan(); fetchToday(); }
    else {
      const err = await res.json();
      alert(err.error || "Failed to create plan");
    }
    setInitiating(false);
  }

  async function resetPlan() {
    if (!confirm("Delete the warmup plan for this phase? This cannot be undone.")) return;
    await deleteWarmupPlan(phase);
    setPlan(null); setTodayBatch(null); setHistoryBatches([]); setUpcoming5([]); setUpcoming10([]);
  }

  async function setStatus(batchLeadId: number, status: string) {
    setUpdating(p => ({ ...p, [batchLeadId]: true }));
    await patchWarmupBatchLead(batchLeadId, status);
    setTodayBatch(prev =>
      prev ? { ...prev, leads: prev.leads.map(l => l.id === batchLeadId ? { ...l, status, sentAt: status === "SENT" ? new Date().toISOString() : l.sentAt } : l) } : prev
    );
    const refreshes: Promise<void>[] = [fetchPlan()];
    if (activeTab === "history") refreshes.push(fetchHistory());
    await Promise.all(refreshes);
    setUpdating(p => ({ ...p, [batchLeadId]: false }));
  }

  async function advanceDay() {
    setAdvancing(true);
    await advanceWarmupDay(phase);
    setShowAdvanceModal(false);
    setAdvancing(false);
    await Promise.all([fetchToday(), fetchPlan()]);
  }

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>;

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-lg mb-3">6-Month Warmup Schedule</h2>
            <div className="space-y-2">
              {WARMUP_SCHEDULE.map(row => (
                <div key={row.range} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-28">{row.range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full bg-blue-500" style={{ width: `${(row.quota / 60) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-36 text-right">
                    {row.quota} emails/day
                    <span className="text-gray-400 font-normal ml-1">({row.perDomain}/domain)</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">5 domains × quota per domain · 30 consecutive days</p>
          </div>
          <div className="border-t pt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button
              onClick={initPlan} disabled={initiating}
              className="bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition"
            >
              {initiating ? "Generating plan…" : "Start 30-Day Warmup Plan"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const todayBatchSummary = plan.batches.find(b => b.isToday);
  const totalSent = plan.batches.reduce((s, b) => s + b.sent, 0);
  const totalQuotaSoFar = plan.batches.filter(b => b.isPast || b.isToday).reduce((s, b) => s + b.quota, 0);
  const daysCompleted = plan.batches.filter(b => b.isPast).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <p className="text-gray-500 text-sm">Started {fmtDate(plan.startDate)} · {plan.totalDays} working days</p>
        <button onClick={resetPlan} className="text-xs text-red-400 hover:text-red-600 hover:underline">Reset plan</button>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-6">
          <StatBox label="Current day" value={plan.currentDay ? `Day ${plan.currentDay} / ${plan.totalDays}` : plan.batches.some(b => !b.isPast && !b.isToday) ? "Not started" : "Complete"} />
          <StatBox label="Today's quota" value={todayBatchSummary ? `${todayBatchSummary.quota} emails` : "—"} />
          <StatBox label="Sent today" value={todayBatchSummary ? `${todayBatchSummary.sent} / ${todayBatchSummary.quota}` : "—"} />
          <StatBox label="Total sent" value={`${totalSent} / ${totalQuotaSoFar}`} />
          <StatBox label="Days done" value={`${daysCompleted} / ${plan.totalDays}`} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Overall progress</span>
            <span>{Math.round((daysCompleted / plan.totalDays) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-blue-600 transition-all" style={{ width: `${(daysCompleted / plan.totalDays) * 100}%` }} />
          </div>
        </div>
        {todayBatchSummary && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Today</span>
              <span>{todayBatchSummary.sent} sent · {todayBatchSummary.skipped} skipped · {todayBatchSummary.quota - todayBatchSummary.sent - todayBatchSummary.skipped} pending</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
              <div className="h-2.5 bg-green-500" style={{ width: `${(todayBatchSummary.sent / todayBatchSummary.quota) * 100}%` }} />
              <div className="h-2.5 bg-yellow-300" style={{ width: `${(todayBatchSummary.skipped / todayBatchSummary.quota) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {([
          { key: "today",     label: "Today's Leads" },
          { key: "next5",     label: "Next 5 Days" },
          { key: "next10",    label: "Next 10 Days" },
          { key: "plan",      label: "Month Plan" },
          { key: "plan90",    label: "90-Day Projection" },
          { key: "history",   label: "History" },
          ...(phase === 6 ? [{ key: "countries" as const, label: "🌍 Countries" }] : []),
          ...(phase === 6 ? [{ key: "instagram" as const, label: "📸 Instagram" }] : []),
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              activeTab === key
                ? key === "countries" ? "border-teal-600 text-teal-700" : key === "instagram" ? "border-pink-500 text-pink-600" : "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "today"     && <TodayTab batch={todayBatch} loading={todayLoading} updating={updating} onStatus={setStatus} templates={templates} showAdvanceModal={showAdvanceModal} advancing={advancing} onOpenModal={() => setShowAdvanceModal(true)} onAdvance={advanceDay} onCloseModal={() => setShowAdvanceModal(false)} page={todayPage} setPage={setTodayPage} lhScores={lhScores} lhScanning={lhScanning} lhProgress={lhProgress} onRunLhScan={runLhScan} repScanning={repScanning} repProgress={repProgress} onRunReportScan={runReportScan} expectedPhase={phase} />}
      {activeTab === "next5"     && <UpcomingTab batches={upcoming5}  loading={upcoming5Loading}  days={5}  />}
      {activeTab === "next10"    && <UpcomingTab batches={upcoming10} loading={upcoming10Loading} days={10} />}
      {activeTab === "plan"      && <MonthPlanTab batches={plan.batches.slice(0, 30)} />}
      {activeTab === "plan90"    && <LongTermPlanTab batches={plan.batches} />}
      {activeTab === "history"   && <HistoryTab batches={historyBatches} loading={historyLoading} />}
      {activeTab === "countries" && <CountryGridTab />}
      {activeTab === "instagram" && <InstagramTab />}
    </div>
  );
}
