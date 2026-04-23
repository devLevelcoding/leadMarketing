"use client";
import { useEffect, useState, useCallback } from "react";

const DOMAIN_LABELS: Record<string, string> = {
  crm:        "Retail / CRM",
  no_website: "No Website",
  health:     "Health & Wellness",
  b2b:        "B2B Services",
  tourism:    "Tourism & Travel",
};

const DOMAIN_COLORS: Record<string, string> = {
  crm:        "bg-purple-500",
  no_website: "bg-gray-500",
  health:     "bg-green-500",
  b2b:        "bg-blue-500",
  tourism:    "bg-orange-500",
};

const STATUS_COLORS: Record<string, string> = {
  NEW:           "bg-gray-100 text-gray-700",
  EMAILED:       "bg-blue-100 text-blue-700",
  REPLIED:       "bg-yellow-100 text-yellow-700",
  CONVERTED:     "bg-green-100 text-green-700",
  NOT_INTERESTED:"bg-red-100 text-red-700",
};

const TABS = [
  { id: "all",     label: "All Phases",        phase: "all",  flag: "🌍", color: "blue" },
  { id: "phase1",  label: "Phase 1 — Europe",  phase: "1",    flag: "🇪🇺", color: "indigo" },
  { id: "phase2",  label: "Phase 2 — Dubai",   phase: "2",    flag: "🇦🇪", color: "amber" },
  { id: "phase3",  label: "Phase 3 — USA",     phase: "3",    flag: "🇺🇸", color: "red" },
];

type Stats = {
  total: number;
  byDomain: { domain: string; _count: { id: number } }[];
  byStatus: { status: string; _count: { id: number } }[];
  byCountry: { country: string; _count: { id: number } }[];
  byPhase:   { phase: number; _count: { id: number } }[];
};

type DayEntry = {
  date: string; dayName: string; dateLabel: string;
  quota: number; isToday: boolean; isPast: boolean;
};

type WeekEntry  = { weekLabel: string; quota: number; days: number };
type MonthEntry = { monthLabel: string; quota: number; days: number };

type Campaign = {
  phase: number | null; totalLeads: number; sentCount: number;
  remaining: number; todayQuota: number; completionDate: string;
  thisWeek: DayEntry[]; thisMonth: WeekEntry[]; threeMonths: MonthEntry[];
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    red:    "bg-red-50 text-red-700 border-red-200",
    green:  "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    gray:   "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.gray}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs mt-1 font-medium uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}

function PhaseTabContent({ phase, tabColor }: { phase: string; tabColor: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignView, setCampaignView] = useState<"week" | "month" | "3months">("week");

  useEffect(() => {
    setStats(null);
    setCampaign(null);
    fetch(`/api/stats?phase=${phase}`).then(r => r.json()).then(setStats);
    fetch(`/api/campaign?phase=${phase}`).then(r => r.json()).then(setCampaign);
  }, [phase]);

  if (!stats || !campaign) {
    return <div className="text-gray-400 text-center py-16">Loading…</div>;
  }

  const statusOrder = ["NEW", "EMAILED", "REPLIED", "CONVERTED", "NOT_INTERESTED"];
  const sortedStatus = [...stats.byStatus].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total Leads" value={stats.total} color={tabColor} />
        {sortedStatus.map(s => (
          <StatCard
            key={s.status}
            label={s.status.replace(/_/g, " ")}
            value={s._count.id}
            color={s.status === "CONVERTED" ? "green" : s.status === "REPLIED" ? "yellow" : "gray"}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By Domain */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Leads by Segment</h2>
          <div className="space-y-3">
            {stats.byDomain.map(d => {
              const pct = stats.total > 0 ? Math.round((d._count.id / stats.total) * 100) : 0;
              return (
                <div key={d.domain}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{DOMAIN_LABELS[d.domain] || d.domain}</span>
                    <span className="font-medium">{d._count.id.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${DOMAIN_COLORS[d.domain] || "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Top Countries / Regions</h2>
          <div className="space-y-2">
            {stats.byCountry.map(c => (
              <div key={c.country} className="flex justify-between text-sm">
                <span>{c.country || "—"}</span>
                <span className="font-medium text-blue-600">{c._count.id.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign Schedule */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-700">Email Campaign Schedule</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Today: <span className="font-semibold text-gray-600">{campaign.todayQuota} emails</span>
              &nbsp;·&nbsp; Sent: {campaign.sentCount.toLocaleString()}
              &nbsp;·&nbsp; Remaining: {campaign.remaining.toLocaleString()}
              &nbsp;·&nbsp; Est. complete: {campaign.completionDate}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["week", "month", "3months"] as const).map(v => (
              <button
                key={v}
                onClick={() => setCampaignView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  campaignView === v ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {v === "week" ? "This Week" : v === "month" ? "This Month" : "3 Months"}
              </button>
            ))}
          </div>
        </div>

        {campaignView === "week" && (
          <div className="grid grid-cols-5 gap-2">
            {campaign.thisWeek.map(day => (
              <div
                key={day.date}
                className={`rounded-lg border p-3 text-center ${
                  day.isToday
                    ? "border-blue-400 bg-blue-50"
                    : day.isPast
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : "border-gray-200"
                }`}
              >
                <div className="text-xs font-medium text-gray-500">{day.dayName}</div>
                <div className="text-xs text-gray-400 mb-1">{day.dateLabel}</div>
                <div className={`text-xl font-bold ${day.isToday ? "text-blue-600" : "text-gray-700"}`}>
                  {day.quota}
                </div>
                <div className="text-xs text-gray-400">emails</div>
                {day.isToday && (
                  <div className="mt-1 text-xs font-semibold text-blue-500">TODAY</div>
                )}
              </div>
            ))}
          </div>
        )}

        {campaignView === "month" && (
          <div className="space-y-2">
            {campaign.thisMonth.map((w, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="text-sm text-gray-600 w-36 shrink-0">{w.weekLabel}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${Math.min((w.quota / 300) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-sm font-semibold text-gray-700 w-16 text-right">
                  {w.quota} <span className="text-gray-400 font-normal text-xs">/ wk</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {campaignView === "3months" && (
          <div className="grid grid-cols-3 gap-4">
            {campaign.threeMonths.map((m, i) => (
              <div key={i} className="border rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500">{m.monthLabel}</div>
                <div className="text-3xl font-bold text-gray-800 mt-1">
                  {m.quota.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">emails · {m.days} working days</div>
                <div className="mt-2 text-xs text-gray-500">
                  ~{Math.round(m.quota / Math.max(m.days, 1))}/day avg
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline status badges */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="font-semibold text-gray-700 mb-3">Pipeline Status</h2>
        <div className="flex flex-wrap gap-2">
          {sortedStatus.map(s => (
            <span
              key={s.status}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[s.status] || "bg-gray-100"}`}
            >
              {s.status.replace(/_/g, " ")}: {s._count.id.toLocaleString()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [globalStats, setGlobalStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats?phase=all").then(r => r.json()).then(setGlobalStats);
  }, []);

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  const phaseLeads = (phase: number) =>
    globalStats?.byPhase.find(p => p.phase === phase)?._count.id ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">LevelCoding lead pipeline overview</p>
      </div>

      {/* Phase summary strip */}
      {globalStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{globalStats.total.toLocaleString()}</div>
            <div className="text-xs text-blue-500 font-medium">Total All Phases</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-indigo-700">{phaseLeads(1).toLocaleString()}</div>
            <div className="text-xs text-indigo-500 font-medium">🇪🇺 Phase 1 Europe</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-amber-700">{phaseLeads(2).toLocaleString()}</div>
            <div className="text-xs text-amber-500 font-medium">🇦🇪 Phase 2 Dubai</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-red-700">{phaseLeads(3).toLocaleString()}</div>
            <div className="text-xs text-red-500 font-medium">🇺🇸 Phase 3 USA</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.flag}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <PhaseTabContent key={activeTab} phase={currentTab.phase} tabColor={currentTab.color} />
    </div>
  );
}
