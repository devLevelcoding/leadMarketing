"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type BatchSummary = {
  id: number; dayNumber: number; date: string; quota: number;
  sent: number; skipped: number; total: number; isToday: boolean; isPast: boolean;
};

type PlanStatus = {
  id: number; phase: number; startDate: string; totalDays: number;
  currentDay: number | null; batches: BatchSummary[];
};

type EmailLog = { id: number; sentAt: string; subject: string; status: string };

type Lead = {
  id: number; name: string; domain: string; category: string | null;
  phone: string | null; website: string | null; city: string | null;
  country: string | null; rating?: string | null; status: string;
  emailLogs: EmailLog[];
};

type BatchLead = { id: number; leadId: number; status: string; sentAt: string | null; lead: Lead };

type TodayBatch   = { id: number; dayNumber: number; date: string; quota: number; leads: BatchLead[] };
type HistoryBatch = { id: number; dayNumber: number; date: string; quota: number; leads: BatchLead[] };
type UpcomingBatch = HistoryBatch;
type Template = { id: number; name: string; language: string; domain: string | null; subject: string; body: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAIN_LABEL: Record<string, string> = {
  crm: "Retail/CRM", no_website: "No Website", health: "Health", b2b: "B2B", tourism: "Tourism",
};
const DOMAIN_COLOR: Record<string, string> = {
  crm: "bg-blue-100 text-blue-700", no_website: "bg-purple-100 text-purple-700",
  health: "bg-green-100 text-green-700", b2b: "bg-orange-100 text-orange-700",
  tourism: "bg-cyan-100 text-cyan-700",
};

const PHASE_TABS = [
  { phase: 0, label: "All Phases",       flag: "🌍", color: "blue"   },
  { phase: 1, label: "Phase 1 — Europe", flag: "🇪🇺", color: "indigo" },
  { phase: 2, label: "Phase 2 — Dubai",  flag: "🇦🇪", color: "amber"  },
  { phase: 3, label: "Phase 3 — USA",    flag: "🇺🇸", color: "red"    },
];

const WARMUP_SCHEDULE = [
  { range: "Days 1–3",   quota: 5,  perDomain: 1 },
  { range: "Days 4–7",   quota: 10, perDomain: 2 },
  { range: "Days 8–14",  quota: 15, perDomain: 3 },
  { range: "Days 15–21", quota: 20, perDomain: 4 },
  { range: "Days 22–30", quota: 25, perDomain: 5 },
];

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtShort(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function interpolate(text: string, lead: Lead): string {
  return text
    .replace(/\{\{company_name\}\}/g, lead.name)
    .replace(/\{\{city\}\}/g, lead.city ?? "")
    .replace(/\{\{country\}\}/g, lead.country ?? "")
    .replace(/\{\{website\}\}/g, lead.website ?? "")
    .replace(/\{\{phone\}\}/g, lead.phone ?? "");
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function WarmupPage() {
  const [activePhase, setActivePhase] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => setTemplates(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Email Warmup</h1>
        <p className="text-gray-500 text-sm mt-1">6-month email campaign plan per phase</p>
      </div>

      {/* Phase tabs */}
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

// ─── Per-Phase Warmup ─────────────────────────────────────────────────────────

function PhaseWarmup({ phase, templates }: { phase: number; templates: Template[] }) {
  const [plan, setPlan]         = useState<PlanStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [startDate, setStartDate]   = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab]   = useState<"today" | "plan" | "history" | "next5" | "next10">("today");

  const [todayBatch, setTodayBatch]   = useState<TodayBatch | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing]     = useState(false);
  const initialBatchId = useRef<number | null | undefined>(undefined);
  const [historyBatches, setHistoryBatches] = useState<HistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [upcoming5, setUpcoming5]   = useState<UpcomingBatch[]>([]);
  const [upcoming5Loading, setUpcoming5Loading] = useState(false);
  const [upcoming10, setUpcoming10] = useState<UpcomingBatch[]>([]);
  const [upcoming10Loading, setUpcoming10Loading] = useState(false);
  const [updating, setUpdating]     = useState<Record<number, boolean>>({});

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const data = await fetch(`/api/warmup?phase=${phase}`).then(r => r.json());
    setPlan(data.plan);
    setLoading(false);
  }, [phase]);

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    const d = await fetch(`/api/warmup/today?phase=${phase}`).then(r => r.json());
    setTodayBatch(d.batch ?? null);
    setTodayLoading(false);
  }, [phase]);

  const fetchHistory  = useCallback(async () => {
    setHistoryLoading(true);
    const d = await fetch(`/api/warmup/history?phase=${phase}`).then(r => r.json());
    setHistoryBatches(d.batches || []);
    setHistoryLoading(false);
  }, [phase]);

  const fetchUpcoming5 = useCallback(async () => {
    setUpcoming5Loading(true);
    const d = await fetch(`/api/warmup/upcoming?days=5&phase=${phase}`).then(r => r.json());
    setUpcoming5(d.batches || []);
    setUpcoming5Loading(false);
  }, [phase]);

  const fetchUpcoming10 = useCallback(async () => {
    setUpcoming10Loading(true);
    const d = await fetch(`/api/warmup/upcoming?days=10&phase=${phase}`).then(r => r.json());
    setUpcoming10(d.batches || []);
    setUpcoming10Loading(false);
  }, [phase]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // Load tab data on mount and when switching tabs — NOT when plan refreshes
  useEffect(() => {
    if (activeTab === "today")   fetchToday();
    if (activeTab === "history") fetchHistory();
    if (activeTab === "next5")   fetchUpcoming5();
    if (activeTab === "next10")  fetchUpcoming10();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function initPlan() {
    setInitiating(true);
    const res = await fetch("/api/warmup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, phase }),
    });
    if (res.ok) { await fetchPlan(); fetchToday(); }
    else {
      const err = await res.json();
      alert(err.error || "Failed to create plan");
    }
    setInitiating(false);
  }

  async function resetPlan() {
    if (!confirm("Delete the warmup plan for this phase? This cannot be undone.")) return;
    await fetch(`/api/warmup?phase=${phase}`, { method: "DELETE" });
    setPlan(null); setTodayBatch(null); setHistoryBatches([]); setUpcoming5([]); setUpcoming10([]);
  }

  async function setStatus(batchLeadId: number, status: string) {
    setUpdating(p => ({ ...p, [batchLeadId]: true }));
    await fetch(`/api/warmup/batch-leads/${batchLeadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    // Update locally — never re-fetch batch on status change so grid stays stable
    setTodayBatch(prev =>
      prev ? { ...prev, leads: prev.leads.map(l => l.id === batchLeadId ? { ...l, status } : l) } : prev
    );
    const refreshes: Promise<void>[] = [fetchPlan()];
    if (activeTab === "history") refreshes.push(fetchHistory());
    await Promise.all(refreshes);
    setUpdating(p => ({ ...p, [batchLeadId]: false }));
  }

  async function advanceDay() {
    setAdvancing(true);
    await fetch(`/api/warmup/advance?phase=${phase}`, { method: "POST" });
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
        <div>
          <p className="text-gray-500 text-sm">
            Started {fmtDate(plan.startDate)} · {plan.totalDays} working days
          </p>
        </div>
        <button onClick={resetPlan} className="text-xs text-red-400 hover:text-red-600 hover:underline">Reset plan</button>
      </div>

      {/* Progress */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-6">
          <Stat label="Current day" value={plan.currentDay ? `Day ${plan.currentDay} / ${plan.totalDays}` : plan.batches.some(b => !b.isPast && !b.isToday) ? "Not started" : "Complete"} />
          <Stat label="Today's quota" value={todayBatchSummary ? `${todayBatchSummary.quota} emails` : "—"} />
          <Stat label="Sent today" value={todayBatchSummary ? `${todayBatchSummary.sent} / ${todayBatchSummary.quota}` : "—"} />
          <Stat label="Total sent" value={`${totalSent} / ${totalQuotaSoFar}`} />
          <Stat label="Days done" value={`${daysCompleted} / ${plan.totalDays}`} />
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

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {([
          { key: "today",   label: "Today's Leads" },
          { key: "next5",   label: "Next 5 Days" },
          { key: "next10",  label: "Next 10 Days" },
          { key: "plan",    label: "Month Plan" },
          { key: "plan",    label: " 3 Month Plan" },
          { key: "plan90",  label: "90-Day Projection" }, // New Key
        
          { key: "history", label: "History" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              activeTab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "today"   && <TodayTab batch={todayBatch} loading={todayLoading} updating={updating} onStatus={setStatus} templates={templates} showAdvanceModal={showAdvanceModal} advancing={advancing} onOpenModal={() => setShowAdvanceModal(true)} onAdvance={advanceDay} onCloseModal={() => setShowAdvanceModal(false)} />}
      {activeTab === "next5"   && <UpcomingTab batches={upcoming5}  loading={upcoming5Loading}  days={5}  />}
      {activeTab === "next10"  && <UpcomingTab batches={upcoming10} loading={upcoming10Loading} days={10} />}
{activeTab === "plan"    && <MonthPlanTab batches={plan.batches.slice(0, 30)} />}

      {activeTab === "plan90"  && <LongTermPlanTab batches={plan.batches} />}
      {activeTab === "history" && <HistoryTab batches={historyBatches} loading={historyLoading} />}
    </div>
  );
}


function LongTermPlanTab({ batches }: { batches: BatchSummary[] }) {
  // 1. Create a 90-day array by extending the existing 30 batches
  const full90Days = [...batches];
  const lastBatch = batches[batches.length - 1];
  const lastDate = new Date(lastBatch?.date || new Date());

  // Fill up to 90 days if the API only gave 30
  for (let i = batches.length + 1; i <= 90; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + (i - batches.length));
    
    full90Days.push({
      id: 9000 + i, // Fake ID for projection
      dayNumber: i,
      date: nextDate.toISOString(),
      quota: 25, // Maintain the max warmup quota
      sent: 0,
      skipped: 0,
      total: 0,
      isToday: false,
      isPast: false
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700">90-Day Full Delivery Grid</h3>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Projection Mode</span>
        </div>
        
        {/* The 90-Day Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10 gap-2">
          {full90Days.map(b => {
            const isProjected = b.dayNumber > 30;
            const isToday = b.isToday;
            
            return (
              <div key={b.id} className={`border rounded-lg p-2 text-center transition-all ${
                isToday ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : 
                isProjected ? "border-gray-100 bg-gray-50/50 opacity-80" : "border-green-100 bg-green-50"
              }`}>
                <p className="text-[10px] font-bold text-gray-500">Day {b.dayNumber}</p>
                <p className="text-[10px] text-gray-400">{new Date(b.date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}</p>
                <div className="mt-1">
                  <p className="text-xs font-bold text-gray-700">{b.quota}</p>
                  <p className="text-[9px] text-gray-400">emails</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
        <p className="text-xs text-blue-700 flex items-center gap-2">
          <span>ℹ️</span> Days 31-90 are calculated at a steady state of 25 emails per day (max warmup capacity).
        </p>
      </div>
    </div>
  );
}

// ─── Month Plan Tab (30-day grid + clickable leads) ──────────────────────────

function MonthPlanTab({ batches }: { batches: BatchSummary[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [batchLeads, setBatchLeads] = useState<Record<number, BatchLead[]>>({});
  const [batchLoading, setBatchLoading] = useState<Record<number, boolean>>({});

  async function toggleDay(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (batchLeads[id]) return;
    setBatchLoading(p => ({ ...p, [id]: true }));
    const data = await fetch(`/api/warmup/batches/${id}`).then(r => r.json());
    setBatchLeads(p => ({ ...p, [id]: data.batch?.leads ?? [] }));
    setBatchLoading(p => ({ ...p, [id]: false }));
  }

  return (
    <div className="space-y-4">
      {/* Schedule legend */}
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

      {/* 30-day grid */}
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

        {/* 90-day grid with scrollable container */}
<div className="bg-white border rounded-xl p-4">
  <h3 className="text-sm font-semibold mb-3 text-gray-700">90-Day Delivery Schedule</h3>
  
  {/* Add max-height and overflow-y-auto */}
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
          
          {/* Smaller font for 90-day view */}
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

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-400 inline-block" />Today</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" />All sent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-100 inline-block" />Missed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" />Upcoming</span>
        </div>
      </div>

      {/* Expanded day leads */}
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

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({ batch, loading, updating, onStatus, templates, showAdvanceModal, advancing, onOpenModal, onAdvance, onCloseModal }: {
  batch: TodayBatch | null; loading: boolean;
  updating: Record<number, boolean>; onStatus: (id: number, s: string) => void;
  templates: Template[]; showAdvanceModal: boolean; advancing: boolean;
  onOpenModal: () => void; onAdvance: () => void; onCloseModal: () => void;
}) {
  const allDone = !!batch && batch.leads.length > 0 &&
    batch.leads.every(l => l.status === "SENT" || l.status === "SKIPPED");

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;
  if (!batch) return (
    <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
      <p className="text-lg font-medium mb-1">No leads scheduled for today</p>
      <p className="text-sm">Check back on your plan start date or view the Month Plan tab.</p>
    </div>
  );

  const sent    = batch.leads.filter(l => l.status === "SENT").length;
  const skipped = batch.leads.filter(l => l.status === "SKIPPED").length;
  const pending = batch.leads.filter(l => l.status === "PENDING").length;
  const sortedLeads = [...batch.leads].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, SKIPPED: 1, SENT: 2 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  });

  return (
    <div className="space-y-4">
      {/* Advance modal */}
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
              <button
                onClick={onCloseModal}
                className="px-5 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Not yet
              </button>
              <button
                onClick={onAdvance}
                disabled={advancing}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {advancing ? "Advancing…" : "Yes, next day →"}
              </button>
            </div>
          </div>
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

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Segment</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Website</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email History</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedLeads.map((bl, idx) => (
              <LeadRow key={bl.id} index={idx + 1} bl={bl} batchDate={batch.date} busy={!!updating[bl.id]} onStatus={onStatus} templates={templates} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadRow({ index, bl, batchDate, busy, onStatus, templates }: {
  index: number; bl: BatchLead; batchDate: string;
  busy: boolean; onStatus: (id: number, s: string) => void; templates: Template[];
}) {
  const lead = bl.lead;
  const lastLog = lead.emailLogs[0];
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
      <td className="px-4 py-3 text-gray-600 text-xs">{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</td>
      <td className="px-4 py-3 text-gray-600 text-xs">{lead.phone || "—"}</td>
      <td className="px-4 py-3 text-xs max-w-[140px] truncate">
        {lead.website
          ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-xs">
        {lastLog ? (
          <div>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${emailStatusColor(lastLog.status)}`}>{lastLog.status}</span>
            <span className="text-gray-400 ml-1">{fmtDate(lastLog.sentAt)}</span>
            {lead.emailLogs.length > 1 && <span className="text-gray-400 ml-1">+{lead.emailLogs.length - 1} more</span>}
          </div>
        ) : <span className="text-gray-300">No history</span>}
      </td>
      <td className="px-4 py-3"><WarmupStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          <CopyButton lead={lead} templates={templates} />
          <CopyLeadDataButton lead={lead} batchDate={batchDate} />
          {bl.status === "PENDING" && (
            <>
              <button disabled={busy} onClick={() => onStatus(bl.id, "SENT")} className="bg-green-600 text-white text-xs px-2.5 py-1 rounded hover:bg-green-700 disabled:opacity-40 transition">Mark Sent</button>
              <button disabled={busy} onClick={() => onStatus(bl.id, "SKIPPED")} className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded hover:bg-yellow-200 disabled:opacity-40 transition">Skip</button>
            </>
          )}
          {(bl.status === "SENT" || bl.status === "SKIPPED") && (
            <button disabled={busy} onClick={() => onStatus(bl.id, "PENDING")} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded hover:bg-gray-200 disabled:opacity-40 transition">Undo</button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Upcoming Tab ─────────────────────────────────────────────────────────────

function UpcomingTab({ batches, loading, days }: { batches: UpcomingBatch[]; loading: boolean; days: number }) {
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

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ batches, loading }: { batches: HistoryBatch[]; loading: boolean }) {
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
        const sent    = batch.leads.filter(l => l.status === "SENT").length;
        const skipped = batch.leads.filter(l => l.status === "SKIPPED").length;
        const pending = batch.leads.filter(l => l.status === "PENDING").length;
        const isOpen  = expandedDay === batch.id;
        return (
          <div key={batch.id} className="bg-white border rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition text-left" onClick={() => setExpandedDay(isOpen ? null : batch.id)}>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm">Day {batch.dayNumber}</span>
                <span className="text-gray-400 text-sm">{fmtDate(batch.date)}</span>
                <span className="text-xs text-gray-400">{batch.quota} quota</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{sent} sent</span>
                {skipped > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{skipped} skipped</span>}
                {pending > 0 && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{pending} pending</span>}
                <span className="text-gray-400 ml-2">{isOpen ? "▲" : "▼"}</span>
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
                        <td className="px-4 py-2.5"><Link href={`/leads/${bl.lead.id}`} className="text-blue-700 hover:underline font-medium text-xs">{bl.lead.name}</Link></td>
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

// ─── Shared helpers ────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function WarmupStatusBadge({ status, sentAt }: { status: string; sentAt: string | null }) {
  if (status === "SENT")    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Sent {sentAt ? fmtDate(sentAt) : ""}</span>;
  if (status === "SKIPPED") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">Skipped</span>;
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Pending</span>;
}

function emailStatusColor(status: string): string {
  switch (status) {
    case "SENT":    return "bg-blue-100 text-blue-700";
    case "OPENED":  return "bg-green-100 text-green-700";
    case "REPLIED": return "bg-purple-100 text-purple-700";
    case "BOUNCED": return "bg-red-100 text-red-600";
    default:        return "bg-gray-100 text-gray-500";
  }
}

function CopyButton({ lead, templates }: { lead: Lead; templates: Template[] }) {
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

function CopyLeadDataButton({ lead, batchDate }: { lead: Lead; batchDate: string }) {
  const [copied, setCopied] = useState(false);
  function copyData() {
    const lines = [
      `Name: ${lead.name}`, `Domain: ${DOMAIN_LABEL[lead.domain] ?? lead.domain}`,
      lead.category ? `Category: ${lead.category}` : null,
      [lead.city, lead.country].filter(Boolean).length ? `Location: ${[lead.city, lead.country].filter(Boolean).join(", ")}` : null,
      lead.phone ? `Phone: ${lead.phone}` : null, lead.website ? `Website: ${lead.website}` : null,
      lead.rating ? `Rating: ${lead.rating}` : null, `Scheduled: ${batchDate}`,
      lead.emailLogs.length > 0 ? `Emails: ${lead.emailLogs.length} (last: ${lead.emailLogs[0].status} on ${fmtDate(lead.emailLogs[0].sentAt)})` : "Emails: none",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copyData} className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded hover:bg-purple-200 transition font-medium">
      {copied ? "Copied!" : "Copy Lead"}
    </button>
  );
}
