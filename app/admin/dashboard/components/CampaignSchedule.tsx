"use client";
import { useState } from "react";
import type { Campaign } from "../types";

export default function CampaignSchedule({ campaign }: { campaign: Campaign }) {
  const [view, setView] = useState<"week" | "month" | "3months">("week");

  return (
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
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                view === v ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v === "week" ? "This Week" : v === "month" ? "This Month" : "3 Months"}
            </button>
          ))}
        </div>
      </div>

      {view === "week" && (
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
              {day.isToday && <div className="mt-1 text-xs font-semibold text-blue-500">TODAY</div>}
            </div>
          ))}
        </div>
      )}

      {view === "month" && (
        <div className="space-y-2">
          {campaign.thisMonth.map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="text-sm text-gray-600 w-36 shrink-0">{w.weekLabel}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((w.quota / 300) * 100, 100)}%` }} />
              </div>
              <div className="text-sm font-semibold text-gray-700 w-16 text-right">
                {w.quota} <span className="text-gray-400 font-normal text-xs">/ wk</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "3months" && (
        <div className="grid grid-cols-3 gap-4">
          {campaign.threeMonths.map((m, i) => (
            <div key={i} className="border rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-gray-500">{m.monthLabel}</div>
              <div className="text-3xl font-bold text-gray-800 mt-1">{m.quota.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">emails · {m.days} working days</div>
              <div className="mt-2 text-xs text-gray-500">~{Math.round(m.quota / Math.max(m.days, 1))}/day avg</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
