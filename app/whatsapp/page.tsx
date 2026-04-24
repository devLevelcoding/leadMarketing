"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaBatchSummary = {
  id: number; dayNumber: number; date: string; quota: number;
  sent: number; noAnswer: number; replied: number; total: number;
  isToday: boolean; isPast: boolean;
};

type WaPlanStatus = {
  id: number; phase: number; startDate: string; totalDays: number;
  currentDay: number | null; batches: WaBatchSummary[];
};

type Lead = {
  id: number; name: string; domain: string; category: string | null;
  phone: string | null; website: string | null; city: string | null;
  country: string | null; rating?: string | null;
};

type WaBatchLead = { id: number; leadId: number; status: string; sentAt: string | null; lead: Lead };

type WaTodayBatch   = { id: number; dayNumber: number; date: string; quota: number; leads: WaBatchLead[] };
type WaHistoryBatch = WaTodayBatch;

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_TABS = [
  { phase: 1, label: "Phase 1 — Europe", flag: "🇪🇺" },
  { phase: 2, label: "Phase 2 — Dubai",  flag: "🇦🇪" },
  { phase: 3, label: "Phase 3 — USA",    flag: "🇺🇸" },
];

const WA_SCHEDULE = [
  { range: "Days 1–3",   quota: 10 },
  { range: "Days 4–7",   quota: 15 },
  { range: "Days 8–14",  quota: 20 },
  { range: "Days 15–30", quota: 25 },
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

function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [activePhase, setActivePhase] = useState(1);

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

      {/* Phase tabs */}
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
  const [plan, setPlan]           = useState<WaPlanStatus | null>(null);
  const [loading, setLoading]     = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<"today" | "history" | "plan">("today");

  const [todayBatch, setTodayBatch]       = useState<WaTodayBatch | null>(null);
  const [todayLoading, setTodayLoading]   = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing]         = useState(false);
  const [todayPage, setTodayPage]         = useState(1);
  const [historyBatches, setHistoryBatches] = useState<WaHistoryBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [updating, setUpdating]           = useState<Record<number, boolean>>({});

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const d = await fetch(`/api/whatsapp/campaign?phase=${phase}`).then(r => r.json());
    setPlan(d.plan);
    setLoading(false);
  }, [phase]);

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    const d = await fetch(`/api/whatsapp/today?phase=${phase}`).then(r => r.json());
    setTodayBatch(d.batch ?? null);
    setTodayLoading(false);
  }, [phase]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const d = await fetch(`/api/whatsapp/history?phase=${phase}`).then(r => r.json());
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
    const res = await fetch("/api/whatsapp/campaign", {
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
    if (!confirm("Delete the WhatsApp campaign for this phase? This cannot be undone.")) return;
    await fetch(`/api/whatsapp/campaign?phase=${phase}`, { method: "DELETE" });
    setPlan(null); setTodayBatch(null); setHistoryBatches([]);
  }

  async function setStatus(batchLeadId: number, status: string) {
    setUpdating(p => ({ ...p, [batchLeadId]: true }));
    await fetch(`/api/whatsapp/batch-leads/${batchLeadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
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
    await fetch(`/api/whatsapp/advance?phase=${phase}`, { method: "POST" });
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
                  <span className="text-sm font-medium w-32 text-right">
                    {row.quota} contacts/day
                  </span>
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

  const todayBatchSummary = plan.batches.find(b => b.isToday);
  const totalSent    = plan.batches.reduce((s, b) => s + b.sent, 0);
  const totalReplied = plan.batches.reduce((s, b) => s + b.replied, 0);
  const daysCompleted = plan.batches.filter(b => b.isPast).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <p className="text-gray-500 text-sm">
          Started {fmtDate(plan.startDate)} · {plan.totalDays} days
        </p>
        <button onClick={resetPlan} className="text-xs text-red-400 hover:text-red-600 hover:underline">Reset plan</button>
      </div>

      {/* Progress card */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-6">
          <WaStat label="Current day"  value={plan.currentDay ? `Day ${plan.currentDay} / ${plan.totalDays}` : "Not started"} />
          <WaStat label="Today's quota" value={todayBatchSummary ? `${todayBatchSummary.quota} contacts` : "—"} />
          <WaStat label="Sent today"   value={todayBatchSummary ? `${todayBatchSummary.sent} / ${todayBatchSummary.quota}` : "—"} />
          <WaStat label="Total sent"   value={String(totalSent)} />
          <WaStat label="Replied"      value={String(totalReplied)} />
          <WaStat label="Days done"    value={`${daysCompleted} / ${plan.totalDays}`} />
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
                {todayBatchSummary.noAnswer} no answer ·{" "}
                {todayBatchSummary.replied} replied ·{" "}
                {todayBatchSummary.quota - todayBatchSummary.sent - todayBatchSummary.noAnswer - todayBatchSummary.replied} pending
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
              <div className="h-2.5 bg-green-500" style={{ width: `${(todayBatchSummary.sent / todayBatchSummary.quota) * 100}%` }} />
              <div className="h-2.5 bg-purple-400" style={{ width: `${(todayBatchSummary.replied / todayBatchSummary.quota) * 100}%` }} />
              <div className="h-2.5 bg-yellow-300" style={{ width: `${(todayBatchSummary.noAnswer / todayBatchSummary.quota) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
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
        />
      )}
      {activeTab === "history" && <WaHistoryTab batches={historyBatches} loading={historyLoading} />}
      {activeTab === "plan"    && <WaPlanTab batches={plan.batches} />}
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function WaTodayTab({ batch, loading, updating, onStatus, showAdvanceModal, advancing, onOpenModal, onAdvance, onCloseModal, page, setPage }: {
  batch: WaTodayBatch | null; loading: boolean;
  updating: Record<number, boolean>; onStatus: (id: number, s: string) => void;
  showAdvanceModal: boolean; advancing: boolean;
  onOpenModal: () => void; onAdvance: () => void; onCloseModal: () => void;
  page: number; setPage: (p: number) => void;
}) {
  const PAGE_SIZE = typeof window !== "undefined" ? parseInt(localStorage.getItem("warmup_pageSize") || "10") : 10;

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

  const allDone = batch.leads.length > 0 &&
    batch.leads.every(l => l.status !== "PENDING");

  const sent     = batch.leads.filter(l => l.status === "SENT").length;
  const noAnswer = batch.leads.filter(l => l.status === "NO_ANSWER").length;
  const replied  = batch.leads.filter(l => l.status === "REPLIED").length;
  const pending  = batch.leads.filter(l => l.status === "PENDING").length;

  const sortedLeads = [...batch.leads].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, NO_ANSWER: 1, SENT: 2, REPLIED: 3 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  });
  const totalPages = Math.ceil(sortedLeads.length / PAGE_SIZE);
  const paginated  = sortedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      {/* Pagination */}
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
                n === page ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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

// ─── Lead Row ─────────────────────────────────────────────────────────────────

function WaLeadRow({ index, bl, busy, onStatus }: {
  index: number; bl: WaBatchLead;
  busy: boolean; onStatus: (id: number, s: string) => void;
}) {
  const lead = bl.lead;
  const rowBg =
    bl.status === "REPLIED"   ? "bg-purple-50 hover:bg-purple-100" :
    bl.status === "SENT"      ? "bg-green-50 hover:bg-green-100" :
    bl.status === "NO_ANSWER" ? "bg-yellow-50 hover:bg-yellow-100" :
                                "hover:bg-green-50";

  return (
    <tr className={`transition-colors ${rowBg}`}>
      <td className="px-4 py-3 text-gray-400 text-xs">{index}</td>
      <td className="px-4 py-3">
        <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline text-sm">{lead.name}</Link>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{lead.category || "—"}</td>
      <td className="px-4 py-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          {lead.country && <span className="text-base leading-none">{countryFlag(lead.country)}</span>}
          <span>{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="flex items-center gap-1.5">
          {lead.phone ? (
            <>
              <a href={`tel:${cleanPhone(lead.phone)}`} className="text-gray-600 hover:text-blue-600 transition">{lead.phone}</a>
              <a
                href={`https://wa.me/${cleanPhone(lead.phone)}`}
                target="_blank"
                rel="noreferrer"
                title="Open in WhatsApp"
                className="text-green-500 hover:text-green-600 transition flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
              </a>
            </>
          ) : <span className="text-gray-300">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{lead.rating ?? "—"}</td>
      <td className="px-4 py-3"><WaStatusBadge status={bl.status} sentAt={bl.sentAt} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          {lead.phone && <WaMessageButton lead={lead} />}
          {lead.phone && <CopyPhoneButton phone={lead.phone} />}
          {bl.status === "PENDING" && (
            <>
              <button disabled={busy} onClick={() => onStatus(bl.id, "SENT")}
                className="bg-green-600 text-white text-xs px-2.5 py-1 rounded hover:bg-green-700 disabled:opacity-40 transition">
                Mark Sent
              </button>
              <button disabled={busy} onClick={() => onStatus(bl.id, "NO_ANSWER")}
                className="bg-yellow-100 text-yellow-700 text-xs px-2.5 py-1 rounded hover:bg-yellow-200 disabled:opacity-40 transition">
                No Answer
              </button>
            </>
          )}
          {bl.status === "SENT" && (
            <button disabled={busy} onClick={() => onStatus(bl.id, "REPLIED")}
              className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded hover:bg-purple-200 disabled:opacity-40 transition">
              Replied!
            </button>
          )}
          {bl.status !== "PENDING" && (
            <button disabled={busy} onClick={() => onStatus(bl.id, "PENDING")}
              className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded hover:bg-gray-200 disabled:opacity-40 transition">
              Undo
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function WaHistoryTab({ batches, loading }: { batches: WaHistoryBatch[]; loading: boolean }) {
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

// ─── 30-Day Plan Tab ──────────────────────────────────────────────────────────

function WaPlanTab({ batches }: { batches: WaBatchSummary[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">30-Day Schedule</h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {WA_SCHEDULE.map(row => (
            <div key={row.range} className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{row.range}</p>
              <p className="text-xl font-bold text-green-700 mt-1">{row.quota}</p>
              <p className="text-xs text-gray-400">contacts/day</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {batches.map(b => {
            const allSent = b.isPast && b.sent === b.quota;
            const partial = b.isPast && b.sent > 0 && b.sent < b.quota;
            const missed  = b.isPast && b.sent === 0;

            let cellClass = "border rounded-lg p-2 text-center transition-all ";
            if (b.isToday)  cellClass += "border-green-500 bg-green-50 ring-1 ring-green-500";
            else if (allSent) cellClass += "border-green-200 bg-green-50";
            else if (partial) cellClass += "border-yellow-200 bg-yellow-50";
            else if (missed)  cellClass += "border-red-100 bg-red-50";
            else              cellClass += "border-gray-100 bg-gray-50";

            return (
              <div key={b.id} className={cellClass}>
                <p className={`text-xs font-semibold ${b.isToday ? "text-green-700" : "text-gray-500"}`}>
                  Day {b.dayNumber}{b.isToday && <span className="ml-1 text-green-500">●</span>}
                </p>
                <p className="text-xs text-gray-400">{new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <p className="text-base font-bold mt-1">{b.quota}</p>
                {(b.isPast || b.isToday) ? (
                  <p className="text-xs mt-0.5">
                    <span className="text-green-600 font-medium">{b.sent}</span>
                    {b.replied > 0 && <span className="text-purple-600 font-medium ml-0.5">+{b.replied}r</span>}
                    <span className="text-gray-400">/{b.quota}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 mt-0.5">—</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-400 inline-block" />Today</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block" />All sent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block" />Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-100 inline-block" />Missed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" />Upcoming</span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function WaStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function WaStatusBadge({ status, sentAt }: { status: string; sentAt: string | null }) {
  const time = sentAt ? new Date(sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  if (status === "REPLIED")   return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Replied {time}</span>;
  if (status === "SENT")      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Sent {time}</span>;
  if (status === "NO_ANSWER") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">No Answer {time}</span>;
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Pending</span>;
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

function buildWaMessage(lead: Lead): string {
  const location = lead.city ? `in ${lead.city}` : lead.country ? `in ${lead.country}` : "";
  const category = lead.category ? lead.category.toLowerCase() : "your business";

  return `Dear ${lead.name} Team,

My name is Marian Pirvan from LevelCoding, a European web development company based in Romania. We help local businesses ${location} establish a strong online presence and attract new clients through a professional website and Google visibility.

I noticed that ${lead.name} ${location} doesn't currently have a website. In today's market, over 80% of purchasing decisions start with an online search — and a business that can't be found online is missing a very large share of potential clients who are already looking for ${category} services.

We build fast, professional websites for local businesses — clean design, fully mobile-optimised, and structured to rank on Google from day one. Most of our clients start receiving new enquiries within 30 days of going live.

As a European partner, we offer high-quality solutions at a cost structure that is far more competitive than local agencies, with full support throughout and beyond the launch.

Would you be open to a brief 10-minute call to discuss how we could help ${lead.name} grow online?

You can book a time directly here: https://consulting.levelcoding.com/book/3

Best regards,
Marian Pirvan
LevelCoding
Phone: +40 746 628 424`;
}

function WaMessageButton({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = buildWaMessage(lead);

  function copyMessage() {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded hover:bg-green-200 transition font-medium"
      >
        Message
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-500">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
                <h2 className="font-bold text-gray-800">WA Message — {lead.name}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <pre className="text-sm text-gray-800 bg-gray-50 rounded-lg px-4 py-3 whitespace-pre-wrap font-sans">{message}</pre>
            </div>
            <div className="px-6 py-4 border-t flex justify-between items-center gap-2">
              {lead.phone && (
                <a
                  href={`https://wa.me/${cleanPhone(lead.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                  </svg>
                  Open in WhatsApp
                </a>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition">Close</button>
                <button onClick={copyMessage} className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition">
                  {copied ? "Copied!" : "Copy Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
