"use client";
import { useEffect, useState } from "react";

type GridLead = {
  id: number; name: string; category: string | null; searchCategory: string | null;
  website: string | null; city: string | null; country: string | null; status: string; domain: string;
  instagramUrl: string | null;
};
type CountryRow = { country: string; total: number; lead: GridLead };

const COUNTRY_FLAG: Record<string, string> = {
  "Germany":        "🇩🇪", "Austria":         "🇦🇹", "Switzerland":    "🇨🇭",
  "Netherlands":    "🇳🇱", "Belgium":         "🇧🇪", "France":         "🇫🇷",
  "Spain":          "🇪🇸", "Italy":           "🇮🇹", "Portugal":       "🇵🇹",
  "Denmark":        "🇩🇰", "Sweden":          "🇸🇪", "Norway":         "🇳🇴",
  "Finland":        "🇫🇮", "Iceland":         "🇮🇸", "Ireland":        "🇮🇪",
  "United Kingdom": "🇬🇧", "Luxembourg":      "🇱🇺", "Poland":         "🇵🇱",
  "Czech Republic": "🇨🇿", "Hungary":         "🇭🇺", "Bulgaria":       "🇧🇬",
  "Romania":        "🇷🇴", "Greece":          "🇬🇷", "UAE":            "🇦🇪",
  "Liechtenstein":  "🇱🇮", "Croatia":         "🇭🇷", "Estonia":        "🇪🇪",
  "USA":            "🇺🇸", "Latvia":          "🇱🇻", "Lithuania":      "🇱🇹",
  "Slovakia":       "🇸🇰", "Slovenia":        "🇸🇮", "Malta":          "🇲🇹",
  "Cyprus":         "🇨🇾",
};

const NICHE_LABEL: Record<string, { label: string; color: string }> = {
  "Government University": { label: "Gov. University",   color: "bg-blue-100 text-blue-700"   },
  "Private University":    { label: "Private University", color: "bg-purple-100 text-purple-700" },
  "Learning Center":       { label: "Learning Center",    color: "bg-teal-100 text-teal-700"   },
};

const STATUS_COLOR: Record<string, string> = {
  NEW:            "bg-gray-100 text-gray-600",
  EMAILED:        "bg-blue-100 text-blue-700",
  REPLIED:        "bg-yellow-100 text-yellow-700",
  CONVERTED:      "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-red-100 text-red-600",
};

function nicheInfo(lead: GridLead) {
  const sc = lead.searchCategory ?? lead.category ?? "";
  for (const [key, val] of Object.entries(NICHE_LABEL)) {
    if (sc.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { label: sc || "—", color: "bg-gray-100 text-gray-500" };
}

export function CountryGridTab() {
  const [rows, setRows]     = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "gov" | "private" | "learning">("all");

  useEffect(() => {
    fetch("/api/warmup/education-grid")
      .then(r => r.json())
      .then(d => setRows(d.countries ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    if (filter === "all") return true;
    const sc = (r.lead.searchCategory ?? r.lead.category ?? "").toLowerCase();
    if (filter === "gov")      return sc.includes("government");
    if (filter === "private")  return sc.includes("private");
    if (filter === "learning") return sc.includes("learning");
    return true;
  });

  if (loading) return <div className="text-gray-400 text-center py-16">Loading…</div>;

  const total = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">{rows.length} countries</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-sm text-gray-500">{total.toLocaleString()} total leads</span>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5">
          {([
            { key: "all",      label: "All" },
            { key: "gov",      label: "🏛️ Gov. University" },
            { key: "private",  label: "🎓 Private" },
            { key: "learning", label: "📚 Learning Center" },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f.key
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Country card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map(({ country, total: cnt, lead }) => {
          const flag   = COUNTRY_FLAG[country] ?? "🌍";
          const niche  = nicheInfo(lead);
          const domain = lead.website
            ? (() => { try { return new URL(lead.website.startsWith("http") ? lead.website : "https://" + lead.website).hostname.replace(/^www\./, ""); } catch { return lead.website; } })()
            : null;

          return (
            <div
              key={country}
              className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-teal-300 hover:shadow-sm transition flex flex-col gap-2"
            >
              {/* Country header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl leading-none">{flag}</span>
                  <span className="text-xs font-bold text-gray-700 truncate">{country}</span>
                </div>
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">
                  {cnt}
                </span>
              </div>

              {/* Lead name */}
              <div className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 min-h-[2.25rem]">
                {lead.name}
              </div>

              {/* Niche badge */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full self-start ${niche.color}`}>
                {niche.label}
              </span>

              {/* City */}
              {lead.city && (
                <div className="text-[11px] text-gray-400 truncate">📍 {lead.city}</div>
              )}

              {/* Website */}
              {domain ? (
                <a
                  href={lead.website!.startsWith("http") ? lead.website! : "https://" + lead.website!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-500 hover:text-blue-700 hover:underline truncate"
                >
                  🌐 {domain}
                </a>
              ) : (
                <span className="text-[11px] text-gray-300">No website</span>
              )}

              {/* Instagram */}
              {lead.instagramUrl ? (
                <a
                  href={lead.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-pink-500 hover:text-pink-700 hover:underline truncate font-medium"
                >
                  📸 {lead.instagramUrl.replace("https://www.instagram.com/", "@").replace(/\/$/, "")}
                </a>
              ) : (
                <a
                  href={`https://www.google.com/search?q=site:instagram.com+"${encodeURIComponent(lead.name)}"`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-gray-300 hover:text-pink-400 hover:underline truncate"
                >
                  📸 find on Instagram
                </a>
              )}

              {/* Status + lead link */}
              <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[lead.status] ?? STATUS_COLOR.NEW}`}>
                  {lead.status.replace(/_/g, " ")}
                </span>
                <a
                  href={`/leads/${lead.id}`}
                  className="text-[10px] text-gray-400 hover:text-gray-600 hover:underline"
                >
                  view →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No countries match this filter.</div>
      )}
    </div>
  );
}
