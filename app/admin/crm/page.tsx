"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Segment {
  country_iso: string;
  industry: string;
  tier: string;
  count: number;
  with_linkedin: number;
  with_website: number;
}

interface MsiRow {
  country_iso: string;
  industry: string;
  opportunity_tier: string;
  saturation_score: number;
  total_sampled: number;
  pct_modern_crm: number;
  pct_no_crm: number;
}

interface Stats {
  total: number;
  withLinkedin: number;
  withWebsite: number;
  linkedinPct: number;
  websitePct: number;
  segments: Segment[];
  msi: MsiRow[];
}

const TIER_COLOR: Record<string, string> = {
  A: "bg-green-900 text-green-300 border border-green-700",
  B: "bg-yellow-900 text-yellow-300 border border-yellow-700",
  C: "bg-red-900 text-red-300 border border-red-700",
};

const TIER_LABEL: Record<string, string> = {
  A: "White Space",
  B: "Mixed",
  C: "Saturated",
};

export default function CrmDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/crm/stats");
      if (!res.ok) throw new Error(await res.text());
      setStats(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (error) return (
    <div className="bg-red-950 border border-red-700 rounded-xl p-6 text-red-300">
      <p className="font-bold mb-1">Could not load CRM database</p>
      <p className="text-sm font-mono">{error}</p>
      <p className="text-sm mt-2 text-red-400">Make sure the pipeline has run at least once: <code>python pilot_run.py</code></p>
    </div>
  );

  if (!stats) return (
    <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  );

  const tierA = stats.segments.filter(s => s.tier === "A");
  const tierB = stats.segments.filter(s => s.tier === "B");
  const tierC = stats.segments.filter(s => s.tier === "C");

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Market Intelligence</h1>
          <p className="text-gray-400 text-sm mt-1">European market saturation analysis · IT, PL, NL pilot</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            disabled={refreshing}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <Link
            href="/admin/crm/leads"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            View All Leads →
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Leads",    value: stats.total.toLocaleString(),        sub: "in database" },
          { label: "LinkedIn URLs",  value: `${stats.withLinkedin}`,             sub: `${stats.linkedinPct}% coverage` },
          { label: "With Website",   value: `${stats.withWebsite}`,              sub: `${stats.websitePct}% coverage` },
          { label: "Segments",       value: stats.segments.length.toString(),    sub: `${tierA.length} Tier A · ${tierB.length} Tier B` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* MSI Table */}
      {stats.msi.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Market Saturation Index</h2>
            <p className="text-xs text-gray-500 mt-0.5">Score 0–100 · lower = more white space opportunity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Country</th>
                  <th className="text-left px-5 py-3">Industry</th>
                  <th className="text-left px-5 py-3">Tier</th>
                  <th className="text-right px-5 py-3">MSI Score</th>
                  <th className="text-right px-5 py-3">Sampled</th>
                  <th className="text-right px-5 py-3">Modern CRM%</th>
                  <th className="text-right px-5 py-3">No CRM%</th>
                </tr>
              </thead>
              <tbody>
                {stats.msi.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-gray-300">{row.country_iso}</td>
                    <td className="px-5 py-3 text-gray-300">{row.industry}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLOR[row.opportunity_tier] || "bg-gray-800 text-gray-400"}`}>
                        {row.opportunity_tier} · {TIER_LABEL[row.opportunity_tier]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${row.saturation_score < 25 ? "text-green-400" : row.saturation_score < 55 ? "text-yellow-400" : "text-red-400"}`}>
                        {row.saturation_score?.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">{row.total_sampled}</td>
                    <td className="px-5 py-3 text-right text-gray-400">{row.pct_modern_crm?.toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right text-gray-400">{row.pct_no_crm?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Segment breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Leads by Segment</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Country</th>
                <th className="text-left px-5 py-3">Industry</th>
                <th className="text-left px-5 py-3">Tier</th>
                <th className="text-right px-5 py-3">Leads</th>
                <th className="text-right px-5 py-3">LinkedIn</th>
                <th className="text-right px-5 py-3">Website</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stats.segments.map((seg, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-gray-300">{seg.country_iso}</td>
                  <td className="px-5 py-3 text-gray-300">{seg.industry}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLOR[seg.tier] || "bg-gray-800 text-gray-400"}`}>
                      {seg.tier}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-white">{seg.count}</td>
                  <td className="px-5 py-3 text-right text-gray-400">
                    {seg.with_linkedin}
                    <span className="text-gray-600 ml-1 text-xs">({Math.round(seg.with_linkedin / seg.count * 100)}%)</span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400">
                    {seg.with_website}
                    <span className="text-gray-600 ml-1 text-xs">({Math.round(seg.with_website / seg.count * 100)}%)</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/crm/leads?country=${seg.country_iso}&industry=${encodeURIComponent(seg.industry)}&tier=${seg.tier}`}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
