"use client";
import { useEffect, useState } from "react";
import { COUNTRY_TZ } from "../constants";

function sendStatus(hour: number, minute: number, isWeekend: boolean): { color: string; label: string } {
  if (isWeekend) return { color: "bg-red-100 text-red-600 border-red-200", label: "Weekend" };
  const t = hour + minute / 60;
  if (t >= 9 && t < 18) return { color: "bg-green-100 text-green-700 border-green-200", label: "Good" };
  if ((t >= 7 && t < 9) || (t >= 18 && t < 20))
    return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Early/Late" };
  return { color: "bg-red-100 text-red-600 border-red-200", label: "Sleeping" };
}

export default function WorldClockPanel() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Best Time to Send</h2>
        <span className="text-xs text-gray-400">updates every 30s · 🟢 9–18h · 🟡 7–9 / 18–20h · 🔴 night/weekend</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {COUNTRY_TZ.map(({ country, tz, flag, phase }) => {
          const local   = new Date(now.toLocaleString("en-US", { timeZone: tz }));
          const h       = local.getHours();
          const m       = local.getMinutes();
          const weekend = local.getDay() === 0 || local.getDay() === 6;
          const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const { color, label } = sendStatus(h, m, weekend);
          const actionable = label === "Good" || label === "Early/Late";
          return (
            <div key={country} className={`rounded-lg border px-3 py-2 ${color}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base leading-none">{flag}</span>
                <span className="text-xs font-medium truncate flex-1">{country}</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{timeStr}</div>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-xs opacity-75">{label}</span>
                <span className="flex gap-1">
                  <a href={`/country?country=${encodeURIComponent(country)}`} title="View country leads"
                    className="text-xs opacity-60 hover:opacity-100 leading-none">🗂️</a>
                  {actionable && (
                    <>
                      <a href={`/warmup?phase=${phase}`} title="Email warmup"
                        className="text-xs opacity-80 hover:opacity-100 leading-none">📧</a>
                      <a href={`/whatsapp?phase=${phase}`} title="WhatsApp campaign"
                        className="text-xs opacity-80 hover:opacity-100 leading-none">💬</a>
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
