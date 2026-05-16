"use client";
import { useEffect, useState } from "react";
import { TABS } from "./dashboard/constants";
import type { Stats } from "./dashboard/types";
import PhaseTabContent from "./dashboard/PhaseTabContent";

const PHASE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  2: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200"  },
  3: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    },
  4: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  },
  5: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  6: { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200"   },
};

export default function Dashboard() {
  const [activeTab, setActiveTab]     = useState("all");
  const [globalStats, setGlobalStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats?phase=all").then(r => r.json()).then(setGlobalStats);
  }, []);

  const currentTab = TABS.find(t => t.id === activeTab) ?? TABS[0];
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{globalStats.total.toLocaleString()}</div>
            <div className="text-xs text-blue-500 font-medium">🌍 All Phases</div>
          </div>
          {([1, 2, 3, 4, 5, 6] as const).map(n => {
            const tab = TABS.find(t => t.phase === String(n))!;
            const c = PHASE_COLORS[n];
            return (
              <div key={n} className={`${c.bg} border ${c.border} rounded-xl p-3 text-center`}>
                <div className={`text-lg font-bold ${c.text}`}>{phaseLeads(n).toLocaleString()}</div>
                <div className={`text-xs font-medium ${c.text} opacity-80`}>{tab.flag} {tab.label}</div>
              </div>
            );
          })}
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

      <PhaseTabContent key={activeTab} phase={currentTab.phase} tabColor={currentTab.color} />
    </div>
  );
}
