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

const COUNTRY_CODE: Record<string, string> = {
  "Albania": "AL", "Andorra": "AD", "Austria": "AT", "Belarus": "BY", "Belgium": "BE",
  "Bosnia and Herzegovina": "BA", "Bulgaria": "BG", "Croatia": "HR", "Cyprus": "CY",
  "Czech Republic": "CZ", "Denmark": "DK", "Estonia": "EE", "Finland": "FI", "France": "FR",
  "Germany": "DE", "Greece": "GR", "Hungary": "HU", "Iceland": "IS", "Ireland": "IE",
  "Italy": "IT", "Kosovo": "XK", "Latvia": "LV", "Liechtenstein": "LI", "Lithuania": "LT",
  "Luxembourg": "LU", "Malta": "MT", "Moldova": "MD", "Monaco": "MC", "Montenegro": "ME",
  "Netherlands": "NL", "North Macedonia": "MK", "Norway": "NO", "Poland": "PL",
  "Portugal": "PT", "Romania": "RO", "San Marino": "SM", "Serbia": "RS", "Slovakia": "SK",
  "Slovenia": "SI", "Spain": "ES", "Sweden": "SE", "Switzerland": "CH", "Ukraine": "UA",
  "United Kingdom": "GB", "Vatican City": "VA",
  "UAE": "AE", "United Arab Emirates": "AE", "Dubai": "AE",
  "United States": "US", "USA": "US",
};

function countryFlag(country: string | null): string {
  if (!country) return "";
  const code = COUNTRY_CODE[country];
  if (!code) return "";
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
}

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
  const [activePhase, setActivePhase] = useState(1);
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
  const [activeTab, setActiveTab]   = useState<"today" | "plan" | "plan90" | "history" | "next5" | "next10">("today");

  const [todayBatch, setTodayBatch]   = useState<TodayBatch | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing]     = useState(false);
  const [todayPage, setTodayPage]     = useState(1);
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
      prev ? { ...prev, leads: prev.leads.map(l => l.id === batchLeadId ? { ...l, status, sentAt: status === "SENT" ? new Date().toISOString() : l.sentAt } : l) } : prev
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
          { key: "plan90",  label: "90-Day Projection" },
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

      {activeTab === "today"   && <TodayTab batch={todayBatch} loading={todayLoading} updating={updating} onStatus={setStatus} templates={templates} showAdvanceModal={showAdvanceModal} advancing={advancing} onOpenModal={() => setShowAdvanceModal(true)} onAdvance={advanceDay} onCloseModal={() => setShowAdvanceModal(false)} page={todayPage} setPage={setTodayPage} />}
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

function TodayTab({ batch, loading, updating, onStatus, templates, showAdvanceModal, advancing, onOpenModal, onAdvance, onCloseModal, page, setPage }: {
  batch: TodayBatch | null; loading: boolean;
  updating: Record<number, boolean>; onStatus: (id: number, s: string) => void;
  templates: Template[]; showAdvanceModal: boolean; advancing: boolean;
  onOpenModal: () => void; onAdvance: () => void; onCloseModal: () => void;
  page: number; setPage: (p: number) => void;
}) {
  const PAGE_SIZE = typeof window !== "undefined" ? parseInt(localStorage.getItem("warmup_pageSize") || "10") : 10;

  const allDone = !!batch && batch.leads.length > 0 &&
    batch.leads.every(l => l.status === "SENT" || l.status === "SKIPPED");

  if (loading) return <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>;
  if (!batch) return (
    <>
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="text-4xl">⏭</div>
            <h2 className="text-xl font-bold text-gray-800">Skip to next day?</h2>
            <p className="text-gray-500 text-sm">No leads are scheduled for today. Advance the plan to the next day?</p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={onCloseModal}
                className="px-5 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
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
      <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-1">No leads scheduled for today</p>
        <p className="text-sm mb-4">Check back on your plan start date or view the Month Plan tab.</p>
        <button
          onClick={onOpenModal}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          Skip to next day →
        </button>
      </div>
    </>
  );

  const sent    = batch.leads.filter(l => l.status === "SENT").length;
  const skipped = batch.leads.filter(l => l.status === "SKIPPED").length;
  const pending = batch.leads.filter(l => l.status === "PENDING").length;
  const sortedLeads = [...batch.leads].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, SKIPPED: 1, SENT: 2 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  });
  const totalPages = Math.ceil(sortedLeads.length / PAGE_SIZE);
  const paginated  = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
            {paginated.map((bl, idx) => (
              <LeadRow key={bl.id} index={(page - 1) * PAGE_SIZE + idx + 1} bl={bl} batchDate={batch.date} busy={!!updating[bl.id]} onStatus={onStatus} templates={templates} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-1 pt-2">
        <button
          onClick={() => { if (page > 1) setPage(page - 1); }}
          disabled={page === 1}
          className="px-3 py-1.5 rounded border text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          ← Prev
        </button>

        {(() => {
          const VISIBLE = 5;
          let start = Math.max(1, page - Math.floor(VISIBLE / 2));
          const end = Math.min(totalPages, start + VISIBLE - 1);
          start = Math.max(1, end - VISIBLE + 1);
          return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-9 h-9 rounded border text-sm font-medium transition ${
                n === page
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ));
        })()}

        <button
          onClick={() => { if (page < totalPages) setPage(page + 1); }}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded border text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          Next →
        </button>
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
      <td className="px-4 py-3 text-gray-600 text-xs">
        <span className="flex items-center gap-1">
          {lead.country && <span className="text-base leading-none">{countryFlag(lead.country)}</span>}
          <span>{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-xs">
        <div className="flex items-center gap-1.5">
          <span>{lead.phone || "—"}</span>
          {lead.phone && !lead.website && (
            <a
              href={`https://wa.me/${lead.phone.replace(/[\s\-().]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              title="Send WhatsApp message"
              className="text-green-500 hover:text-green-600 transition flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
            </a>
          )}
        </div>
      </td>
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
          <GenerateEmailButton lead={lead} />
          <CopyButton lead={lead} templates={templates} />
          <CopyLeadDataButton lead={lead} batchDate={batchDate} />
          {lead.phone && !lead.website && (
            <CopyPhoneButton phone={lead.phone} />
          )}
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
  if (status === "SENT") {
    const time = sentAt ? new Date(sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    const date = sentAt ? fmtDate(sentAt) : "";
    return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Sent {date} {time}</span>;
  }
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

function CopyPhoneButton({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="bg-teal-100 text-teal-700 text-xs px-2.5 py-1 rounded hover:bg-teal-200 transition font-medium">
      {copied ? "Copied!" : "Copy Phone"}
    </button>
  );
}

function buildEmail(lead: Lead): { subject: string; body: string } {
  const location = [lead.city, lead.country].filter(Boolean).join(", ");
  const site = lead.website ? lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;

  const domainIntros: Record<string, { subject: string; p1: string; p2: string; p3: string; p4: string }> = {
    crm: {
      subject: `Grow your customer base — CRM & Digital Solutions for ${lead.name}`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} represents exactly the kind of business that benefits most from a modern CRM and digital infrastructure. For a ${lead.category ?? "retail"} business${site ? ` with an established online presence like ${site}` : ""}, managing customers, automating follow-ups, and building a loyalty programme can directly translate into repeat revenue and stronger brand recognition. In a competitive retail landscape, the businesses that win long-term are the ones that know their customers — their preferences, their purchase history, and the right moment to reach back out.`,
      p2: `We have helped businesses across Europe turn one-time customers into loyal regulars through custom CRM solutions, high-speed web platforms, and seamless mobile integrations. Our systems are built to handle high volumes of local and international clients while keeping data secure and the customer journey completely frictionless. Whether the goal is reducing cart abandonment, increasing average order value, or automating seasonal campaigns — we build the infrastructure that makes it happen quietly in the background while your team focuses on what they do best.`,
      p3: `One area where we consistently deliver outsized impact is in post-purchase communication. Most businesses spend heavily to acquire a customer and almost nothing to retain them. With a well-configured CRM and automated email sequences, you can re-engage past buyers at exactly the right moment — increasing lifetime value without increasing your marketing budget. We can audit your current setup, identify the gaps, and build a system tailored specifically to ${lead.name}'s customer base and ${lead.category ?? "product"} cycle.`,
      p4: `We also bring deep experience in integrating CRM platforms with existing Point-of-Sale systems, inventory tools, and e-commerce backends — so you get a unified view of every customer interaction, online and in-store. Our European client base means we understand GDPR compliance requirements inside out, and we build everything with data privacy as a foundation, not an afterthought.`,
    },
    no_website: {
      subject: `Get online and grow — Web Presence & Digital Strategy for ${lead.name}`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} is exactly the kind of local business that could unlock significant new revenue with the right digital presence. In today's market, customers search online before they walk through the door — and without a website or Google listing, you are invisible to a very large share of your potential audience. Studies consistently show that over 80% of local purchasing decisions begin with an online search, and a business that cannot be found online is effectively leaving that revenue on the table for competitors who can.`,
      p2: `We specialize in building fast, professional websites for local businesses — clean design, fully mobile-optimised, and easy for your team to manage without any technical knowledge. We also handle complete SEO setup and Google Business Profile optimisation so that when customers in ${lead.city ?? "your area"} search for ${lead.category ?? "your service"}, ${lead.name} appears at the top of the results. Our onboarding process is straightforward and our solutions are priced to make clear business sense from day one.`,
      p3: `Beyond the initial launch, we provide ongoing support to keep your site fast, secure, and ranking well. We set up performance monitoring, review your Google Analytics monthly, and flag any technical issues before they affect your visibility. Many of our clients see a measurable increase in foot traffic and enquiries within the first 60 days — not because we use tricks, but because we build correctly from the ground up with search intent and user experience as the priority.`,
      p4: `We also integrate booking or contact systems where relevant, so potential customers who find you online can immediately take action — whether that is booking an appointment, requesting a quote, or simply getting your phone number in one tap from their phone. The entire customer acquisition loop, from discovery to first contact, happens automatically and around the clock — even when your team is not working.`,
    },
    health: {
      subject: `Digital Growth for Health & Wellness — ${lead.name} | LevelCoding`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} represents a wonderful opportunity to connect with more clients through a stronger digital presence. For a ${lead.category ?? "wellness"} business${site ? ` like ${site}` : ""}, the online experience — from discovering your studio to booking a session to receiving a reminder the morning of — is often the first and most lasting impression a new client has of your brand. In the wellness industry, trust and professionalism are everything, and your digital presence must reflect the quality of the experience you deliver in person.`,
      p2: `We help health and wellness businesses build seamless online booking systems, beautifully designed mobile experiences, and automated client communication flows that dramatically reduce no-shows and keep your community engaged between visits. Our booking platforms integrate directly with your calendar, send automated reminders via email and SMS, and allow clients to reschedule without creating administrative overhead for your team. The result is fewer missed appointments, a fuller schedule, and a more professional client experience from the very first interaction.`,
      p3: `We also build membership and loyalty systems specifically designed for wellness studios — recurring billing, class pass management, drop-in tracking, and personalised check-in flows that make your regulars feel known and valued. These systems are designed to convert one-time visitors into committed members, which is the single most effective way to grow predictable monthly revenue in the health and wellness space.`,
      p4: `Our platforms are built to feel as calm, elegant, and intentional as the services you offer — clean design, fast load times, and a user experience that requires no instruction manual. At the same time, they work hard behind the scenes: tracking retention rates, identifying clients at risk of churning, and giving you the data you need to make smart decisions about your schedule, pricing, and promotions.`,
    },
    b2b: {
      subject: `Technical Partnership Opportunity — ${lead.name} | LevelCoding`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} is exactly the kind of established B2B firm that we most enjoy working with. For a ${lead.category ?? "professional services"} company${site ? ` like ${site}` : ""}, having robust and scalable internal tools alongside a polished client-facing digital presence is not a luxury — it is a direct competitive advantage that compounds over time. The firms that invest in their technical infrastructure today are the ones that can take on more clients, deliver faster, and operate at higher margins five years from now.`,
      p2: `We provide end-to-end technical solutions for B2B companies: custom internal dashboards, client portals, CRM integrations, API connections between existing tools, and full workflow automation. We have built systems that eliminate hundreds of hours of manual data entry per month, replaced fragile spreadsheet-based reporting with real-time dashboards, and connected previously siloed platforms into a single coherent operational picture. As a European engineering partner based in Romania, we offer the technical depth and delivery speed of a senior team at a cost structure that makes very clear commercial sense.`,
      p3: `One of the areas where we most frequently deliver transformational impact for B2B clients is in client-facing portals and reporting tools. When your clients can log in to see the status of their projects, download their reports, or access their historical data without contacting your team — you save hours of account management time per week and simultaneously deliver a more premium experience. We design and build these portals to match your brand precisely and integrate with the tools your team already uses.`,
      p4: `We also bring deep experience in secure data handling, GDPR-compliant architecture, and building systems that scale as your firm grows — so you are never in a position where your tools become a bottleneck. Our clients typically engage us for an initial project and then continue as a retained technical partner, because having a dedicated engineering team on call is genuinely more cost-effective than hiring full-time senior developers in Western European markets.`,
    },
    tourism: {
      subject: `More Bookings, Higher Revenue — Digital Solutions for ${lead.name}`,
      p1: `We are reaching out to the ${location || "your"} team because ${lead.name} represents exactly the kind of travel and hospitality business that can grow dramatically through smarter digital infrastructure. For a tourism business${site ? ` like ${site}` : ""}, the booking journey — from the very first Google search through to the confirmation email and pre-arrival communication — must be fast, trustworthy, and beautifully designed. In an industry where the customer is comparing you to five alternatives on the same screen, the quality of your digital experience is often what tips the decision in your favour.`,
      p2: `We specialize in building high-converting booking platforms, multilingual travel websites, and automated guest communication systems for hotels, tour operators, B&Bs, and hospitality brands across Europe. Our platforms are built specifically to reduce the gap between visitors landing on your website and completing a booking — through optimised user flows, trust-building design elements, and frictionless payment integration. Our clients typically see a meaningful increase in direct bookings within the first quarter after launch, reducing their dependency on OTA platforms and the commissions that come with them.`,
      p3: `We also build pre-arrival and post-stay communication sequences that run automatically — welcome emails with local tips, day-before reminders, check-in instructions, post-stay review requests, and seasonal re-engagement campaigns for past guests. These flows turn a single stay into a long-term relationship, and a satisfied guest into a source of referrals and repeat bookings. When this is set up correctly, a significant portion of your future revenue comes from people who have already stayed with you — which is the most cost-effective marketing channel available.`,
      p4: `For properties targeting international guests, we also handle full multilingual implementation — ensuring that visitors from Germany, the Netherlands, Switzerland, or Scandinavia see your website in their language, with culturally appropriate messaging and localised trust signals. Combined with technical SEO optimisation for international search, this opens up audience segments that many tourism businesses in ${lead.country ?? "your region"} are currently not capturing at all.`,
    },
  };

  const d = domainIntros[lead.domain] ?? domainIntros.crm;

  const subject = d.subject;
  const body = `Dear ${lead.name} Team,

Hello,

My name is Marian Pirvan and I represent LevelCoding, a European IT-services firm based in Romania. We specialize in high-performance web development, mobile solutions, CRM systems, and platform integrations for businesses across Europe. We work with clients ranging from independent local businesses to established regional brands, and our focus is always the same: deliver measurable results through clean, reliable technology.

${d.p1}

${d.p2}

${d.p3}

${d.p4}

As a European partner, we combine the technical depth of a senior engineering team with the agility and cost efficiency that Western European agencies rarely offer. All of our work is built to last — documented, tested, and handed over with full transparency so your team is never dependent on us to make changes. We work in long-term partnerships because we believe the best results come from understanding a business deeply over time, not from one-off project engagements.

I would love to schedule a brief 15-minute introductory call to learn more about ${lead.name}'s current setup and share a few specific ideas we have already been thinking about for a business in your category. There is no commitment involved — just a conversation to see if there is a genuine fit.

You can view our work and book a time that suits you directly here: https://consulting.levelcoding.com/book/3

Thank you for your time, and I look forward to hearing from you.

Best regards,

Marian Pirvan
LevelCoding
Phone: +40 746 628 424
Email: marian@outreach.levelcoding.com
LinkedIn: marian-pirvan-a182ab95`;

  return { subject, body };
}

function GenerateEmailButton({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { subject, body } = buildEmail(lead);

  function copyAll() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded hover:bg-blue-200 transition font-medium"
      >
        Generate Email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Email Draft — {lead.name}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Subject</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">{subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Body</p>
                <pre className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap font-sans">{body}</pre>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition">Close</button>
              <button onClick={copyAll} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                {copied ? "Copied!" : "Copy Full Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
