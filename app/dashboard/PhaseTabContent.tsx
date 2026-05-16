"use client";
import { useEffect, useState } from "react";
import { DOMAIN_LABELS, DOMAIN_COLORS, STATUS_COLORS } from "./constants";
import type { Stats, Campaign } from "./types";
import StatCard from "./components/StatCard";
import WorldClockPanel from "./components/WorldClockPanel";
import CountryRegionPanel from "./components/CountryRegionPanel";
import CampaignSchedule from "./components/CampaignSchedule";
import { CountryGridTab } from "../warmup/tabs/CountryGridTab";

const STATUS_ORDER = ["NEW", "EMAILED", "REPLIED", "CONVERTED", "NOT_INTERESTED"];

export default function PhaseTabContent({ phase, tabColor }: { phase: string; tabColor: string }) {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    setStats(null);
    setCampaign(null);
    fetch(`/api/stats?phase=${phase}`).then(r => r.json()).then(setStats);
    fetch(`/api/campaign?phase=${phase}`).then(r => r.json()).then(setCampaign);
  }, [phase]);

  if (!stats || !campaign) {
    return <div className="text-gray-400 text-center py-16">Loading…</div>;
  }

  const sortedStatus = [...stats.byStatus].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
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

      {phase === "6" && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Education — 1 Lead per Country</h2>
          <CountryGridTab />
        </div>
      )}

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

        <CountryRegionPanel byCountry={stats.byCountry} />
      </div>

      <WorldClockPanel />

      <CampaignSchedule campaign={campaign} />

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
