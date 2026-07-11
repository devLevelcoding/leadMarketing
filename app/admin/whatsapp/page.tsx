"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatBox from "@/components/ui/StatBox";
import { fmtDate } from "@/lib/leadUtils";
import type { WaBatchSummary, WaPlanStatus, WaTodayBatch, WaHistoryBatch } from "./types";
import { PHASE_TABS, WA_SCHEDULE } from "./constants";
import { getWaCampaign, getWaToday, getWaHistory, createWaCampaign, deleteWaCampaign, patchWaBatchLead, advanceWaDay } from "./api";
import { WaTodayTab } from "./tabs/WaTodayTab";
import { WaHistoryTab } from "./tabs/WaHistoryTab";
import { WaPlanTab } from "./tabs/WaPlanTab";

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  return <Suspense><WhatsAppPageInner /></Suspense>;
}

function WhatsAppPageInner() {
  const searchParams = useSearchParams();
  const [activePhase, setActivePhase] = useState(() => {
    const p = searchParams.get("phase");
    return p ? parseInt(p) : 1;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-green-500">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
          </svg>
          WhatsApp Campaign
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Direct outreach to phone-only leads (no website) — sorted by country for diversity
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {PHASE_TABS.map(t => (
          <button
            key={t.phase}
            onClick={() => setActivePhase(t.phase)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              activePhase === t.phase
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.flag}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      <PhaseWa key={activePhase} phase={activePhase} />
    </div>
  );
}

// ─── Per-Phase Component ──────────────────────────────────────────────────────

function PhaseWa({ phase }: { phase: number }) {
  const [plan, setPlan]               = useState<WaPlanStatus | null>(null);
  const [loading, setLoading]         = useState(true);
  const [initiating, setInitiating]   = useState(false);
  const [startDate, setStartDate]     = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab]     = useState<"today" | "history" | "plan">("today");
  const [campaignMonth, setCampaignMonth] = useState(1);

  useEffect(() => {
    try { setCampaignMonth(JSON.parse(localStorage.getItem(`wa_month_p${phase}`) ?? "1") ?? 1); } catch { /* */ }
  }, [phase]);

  const [todayBatch, setTodayBatch]         = useState<WaTodayBatch | null>(null);
  const [todayLoading, setTodayLoading]     = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing]           = useState(false);
  const [todayPage, setTodayPage]           = useState(1);
  const [historyBatches, setHistoryBatches] = useState<WaHistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [updating, setUpdating]             = useState<Record<number, boolean>>({});

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const d = await getWaCampaign(phase);
    setPlan(d.plan ?? null);
    setLoading(false);
  }, [phase]);

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    const d = await getWaToday(phase);
    setTodayBatch(d.batch ?? null);
    setTodayLoading(false);
  }, [phase]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const d = await getWaHistory(phase);
    setHistoryBatches(d.batches || []);
    setHistoryLoading(false);
  }, [phase]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  useEffect(() => {
    if (activeTab === "today")   fetchToday();
    if (activeTab === "history") fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function initPlan() {
    setInitiating(true);
    const res = await createWaCampaign(phase, startDate);
    if (res.ok) {
      localStorage.setItem(`wa_month_p${phase}`, "1");
      setCampaignMonth(1);
      await fetchPlan(); fetchToday();
    } else {
      try { const err = await res.json(); alert(err.error || "Failed to create plan"); }
      catch { alert("Failed to create plan"); }
    }
    setInitiating(false);
  }

  async function resetPlan() {
    if (!confirm("Delete the WhatsApp campaign for this phase? This cannot be undone.")) return;
    await deleteWaCampaign(phase);
    setPlan(null); setTodayBatch(null); setHistoryBatches([]);
  }

  const [startingNext, setStartingNext] = useState(false);
  async function startNextMonth() {
    if (!confirm("Start a new 30-day WhatsApp campaign for this phase from today?")) return;
    setStartingNext(true);
    await deleteWaCampaign(phase);
    const today = new Date().toISOString().slice(0, 10);
    const res = await createWaCampaign(phase, today);
    if (res.ok) {
      const next = campaignMonth + 1;
      localStorage.setItem(`wa_month_p${phase}`, String(next));
      setCampaignMonth(next);
      setStartDate(today);
      await fetchPlan();
      fetchToday();
    } else {
      try { const err = await res.json(); alert(err.error || "Failed to create plan"); }
      catch { alert("Failed to create plan"); }
    }
    setStartingNext(false);
  }

  async function setStatus(batchLeadId: number, status: string) {
    setUpdating(p => ({ ...p, [batchLeadId]: true }));
    await patchWaBatchLead(batchLeadId, status);
    setTodayBatch(prev =>
      prev ? {
        ...prev,
        leads: prev.leads.map(l =>
          l.id === batchLeadId
            ? { ...l, status, sentAt: status !== "PENDING" ? new Date().toISOString() : l.sentAt }
            : l
        ),
      } : prev
    );
    const refreshes: Promise<void>[] = [fetchPlan()];
    if (activeTab === "history") refreshes.push(fetchHistory());
    await Promise.all(refreshes);
    setUpdating(p => ({ ...p, [batchLeadId]: false }));
  }

  async function advanceDay() {
    setAdvancing(true);
    await advanceWaDay(phase);
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
            <h2 className="font-semibold text-lg mb-3">WhatsApp Outreach Schedule</h2>
            <p className="text-sm text-gray-500 mb-4">
              Contacts are filtered to <strong>phone-only leads</strong> (no website) from this phase.
              Each day delivers a country-diverse batch for maximum reach.
            </p>
            <div className="space-y-2">
              {WA_SCHEDULE.map(row => (
                <div key={row.range} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-28">{row.range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full bg-green-500" style={{ width: `${(row.quota / 25) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-32 text-right">{row.quota} contacts/day</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <button
              onClick={initPlan} disabled={initiating}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {initiating ? "Generating plan…" : "Start 30-Day WhatsApp Campaign"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const todayBatchSummary = plan.batches.find((b: WaBatchSummary) => b.isToday);
  const totalSent    = plan.batches.reduce((s: number, b: WaBatchSummary) => s + b.sent, 0);
  const totalReplied = plan.batches.reduce((s: number, b: WaBatchSummary) => s + b.replied, 0);
  const daysCompleted = plan.batches.filter((b: WaBatchSummary) => b.isPast).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <p className="text-gray-500 text-sm">Started {fmtDate(plan.startDate)} · {plan.totalDays} days</p>
          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">
            Campaign Month {campaignMonth}
          </span>
        </div>
        <button onClick={resetPlan} className="text-xs text-red-400 hover:text-red-600 hover:underline">Reset plan</button>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-6">
          <StatBox label="Current day"  value={plan.currentDay ? `Day ${plan.currentDay} / ${plan.totalDays}` : "Not started"} />
          <StatBox label="Today's quota" value={todayBatchSummary ? `${todayBatchSummary.quota} contacts` : "—"} />
          <StatBox label="Sent today"   value={todayBatchSummary ? `${todayBatchSummary.sent} / ${todayBatchSummary.quota}` : "—"} />
          <StatBox label="Total sent"   value={String(totalSent)} />
          <StatBox label="Replied"      value={String(totalReplied)} />
          <StatBox label="Days done"    value={`${daysCompleted} / ${plan.totalDays}`} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Overall progress</span>
            <span>{Math.round((daysCompleted / plan.totalDays) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-green-600 transition-all" style={{ width: `${(daysCompleted / plan.totalDays) * 100}%` }} />
          </div>
        </div>
        {todayBatchSummary && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Today</span>
              <span>
                {todayBatchSummary.sent} sent ·{" "}
                {todayBatchSummary.replied} replied ·{" "}
                {todayBatchSummary.noAnswer} no answer ·{" "}
                {todayBatchSummary.skipped} skipped ·{" "}
                {todayBatchSummary.quota - todayBatchSummary.sent - todayBatchSummary.noAnswer - todayBatchSummary.replied - todayBatchSummary.skipped} pending
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
              <div className="h-2.5 bg-green-500"  style={{ width: `${(todayBatchSummary.sent    / todayBatchSummary.quota) * 100}%` }} />
              <div className="h-2.5 bg-purple-400" style={{ width: `${(todayBatchSummary.replied  / todayBatchSummary.quota) * 100}%` }} />
              <div className="h-2.5 bg-yellow-300" style={{ width: `${(todayBatchSummary.noAnswer / todayBatchSummary.quota) * 100}%` }} />
              <div className="h-2.5 bg-red-300"    style={{ width: `${(todayBatchSummary.skipped  / todayBatchSummary.quota) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {([ { key: "today", label: "Today's Leads" }, { key: "history", label: "History" }, { key: "plan", label: "30-Day Plan" } ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              activeTab === key ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "today"   && (
        <WaTodayTab
          batch={todayBatch} loading={todayLoading} updating={updating}
          onStatus={setStatus} showAdvanceModal={showAdvanceModal} advancing={advancing}
          onOpenModal={() => setShowAdvanceModal(true)} onAdvance={advanceDay}
          onCloseModal={() => setShowAdvanceModal(false)} page={todayPage} setPage={setTodayPage}
          isComplete={daysCompleted >= plan.totalDays}
          onStartNewMonth={startNextMonth}
          startingNext={startingNext}
        />
      )}
      {activeTab === "history" && <WaHistoryTab batches={historyBatches} loading={historyLoading} />}
      {activeTab === "plan"    && <WaPlanTab batches={plan.batches} />}
    </div>
  );
}
