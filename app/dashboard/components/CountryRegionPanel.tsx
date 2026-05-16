"use client";
import { useState } from "react";
import { COUNTRY_REGION, REGION_FLAG } from "../constants";
import type { CountryStat } from "../types";

function BarRow({ label, total, contacted, skipped, flag, onClick, isHeader, isExpanded }: {
  label: string; total: number; contacted: number; skipped: number;
  flag?: string; onClick?: () => void; isHeader?: boolean; isExpanded?: boolean;
}) {
  const remaining = total - contacted - skipped;
  return (
    <div className={onClick ? "cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition" : ""} onClick={onClick}>
      <div className="flex justify-between text-sm mb-1">
        <span className={`flex items-center gap-1.5 ${isHeader ? "font-semibold text-gray-800" : "text-gray-700"}`}>
          {flag && <span>{flag}</span>}
          {label || "—"}
          {onClick && <span className="text-gray-300 text-xs">{isExpanded ? "▲" : "▼"}</span>}
        </span>
        <span className="tabular-nums flex items-center gap-1 text-xs">
          <span className="text-blue-500 font-bold">{contacted}</span>
          {skipped > 0 && <span className="text-red-400 font-bold">+{skipped}s</span>}
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 font-bold">{total}</span>
          {remaining > 0 && <span className="text-gray-400 ml-1">({remaining} left)</span>}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${total > 0 ? (contacted / total) * 100 : 0}%` }} />
        <div className="h-full bg-red-300 transition-all"  style={{ width: `${total > 0 ? (skipped  / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export default function CountryRegionPanel({ byCountry }: { byCountry: CountryStat[] }) {
  const [view, setView] = useState<"region" | "country">("region");
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  const regionMap = new Map<string, { total: number; contacted: number; skipped: number; countries: CountryStat[] }>();
  for (const c of byCountry) {
    const region = COUNTRY_REGION[c.country] ?? "Other";
    if (!regionMap.has(region)) regionMap.set(region, { total: 0, contacted: 0, skipped: 0, countries: [] });
    const r = regionMap.get(region)!;
    r.total     += c._count.id;
    r.contacted += c.contacted;
    r.skipped   += c.skipped ?? 0;
    r.countries.push(c);
  }
  const regions = Array.from(regionMap.entries()).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Countries / Regions</h2>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setView("region")}
            className={`px-3 py-1 rounded-full font-medium transition ${view === "region" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
          >By Region</button>
          <button
            onClick={() => setView("country")}
            className={`px-3 py-1 rounded-full font-medium transition ${view === "country" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
          >By Country</button>
        </div>
      </div>

      <div className="space-y-3">
        {view === "region" ? (
          regions.map(([region, r]) => (
            <div key={region}>
              <BarRow
                label={region} flag={REGION_FLAG[region]} total={r.total}
                contacted={r.contacted} skipped={r.skipped} isHeader
                isExpanded={expandedRegion === region}
                onClick={() => setExpandedRegion(expandedRegion === region ? null : region)}
              />
              {expandedRegion === region && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                  {r.countries.sort((a, b) => b._count.id - a._count.id).map(c => (
                    <BarRow
                      key={c.country} label={c.country} total={c._count.id}
                      contacted={c.contacted} skipped={c.skipped ?? 0}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          byCountry.slice(0, 15).map(c => (
            <BarRow
              key={c.country} label={c.country} total={c._count.id}
              contacted={c.contacted} skipped={c.skipped ?? 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
