"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { countryFlag } from "@/lib/leadUtils";
import Pagination from "@/components/ui/Pagination";

type IGLead = {
  id: number; name: string; country: string | null; city: string | null;
  searchCategory: string | null; category: string | null; domain: string;
  website: string | null; instagramUrl: string | null;
  instagramStatus: string | null; instagramDmAt: string | null;
  status: string;
};

const NICHE_BADGE: Record<string, { label: string; cls: string }> = {
  "government": { label: "🏛️ Gov. Univ.",      cls: "bg-blue-100 text-blue-700"   },
  "private":    { label: "🎓 Private Univ.",    cls: "bg-purple-100 text-purple-700" },
  "learning":   { label: "📚 Learning Center",  cls: "bg-teal-100 text-teal-700"   },
  "language":   { label: "🌐 Language School",  cls: "bg-cyan-100 text-cyan-700"   },
};

function nicheBadge(sc: string | null) {
  const s = (sc ?? "").toLowerCase();
  for (const [key, val] of Object.entries(NICHE_BADGE)) {
    if (s.includes(key)) return val;
  }
  return { label: sc ?? "—", cls: "bg-gray-100 text-gray-500" };
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "Pending",  cls: "bg-gray-100 text-gray-500"    },
  DM_SENT:  { label: "DM Sent",  cls: "bg-green-100 text-green-700"  },
  SKIPPED:  { label: "Skipped",  cls: "bg-yellow-100 text-yellow-700" },
  REPLIED:  { label: "Replied",  cls: "bg-purple-100 text-purple-700" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const FILTERS = [
  { key: "all",     label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "DM_SENT", label: "DM Sent" },
  { key: "REPLIED", label: "Replied" },
  { key: "SKIPPED", label: "Skipped" },
] as const;

export function InstagramTab() {
  const [leads,    setLeads]    = useState<IGLead[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [filter,   setFilter]   = useState<"all" | "PENDING" | "DM_SENT" | "SKIPPED" | "REPLIED">("all");
  const [search,   setSearch]   = useState("");
  const [query,    setQuery]    = useState(""); // debounced
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<number, boolean>>({});

  const PAGE_SIZE = 25;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: filter });
    if (query) params.set("q", query);
    const res  = await fetch(`/api/instagram-leads?${params}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Server error"); setLoading(false); return; }
    setError(null);
    setLeads(data.leads ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, filter, query]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function setStatus(leadId: number, status: string) {
    setUpdating(p => ({ ...p, [leadId]: true }));
    await fetch("/api/instagram-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status }),
    });
    setLeads(prev => prev.map(l =>
      l.id === leadId
        ? { ...l, instagramStatus: status, instagramDmAt: status === "DM_SENT" ? new Date().toISOString() : null }
        : l
    ));
    setUpdating(p => ({ ...p, [leadId]: false }));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const counts = {
    all:     total,
    PENDING: leads.filter(l => !l.instagramStatus || l.instagramStatus === "PENDING").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">📸 Instagram Outreach</span>
          <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium border border-pink-200">{total} leads</span>
        </div>
        <p className="text-xs text-gray-400">Independent from email warmup — track your Instagram DMs here</p>
      </div>

      {/* Filter + Search bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f.key
                  ? "bg-pink-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search name, country…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto border rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-300 w-48"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-mono">{error}</div>
      )}
      {loading
        ? <p className="text-gray-400 text-sm text-center py-12">Loading…</p>
        : leads.length === 0
          ? <p className="text-gray-400 text-sm text-center py-12">No leads match this filter.</p>
          : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Institution</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Instagram</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="sticky right-0 bg-gray-50 px-4 py-3 font-medium text-gray-600 text-center border-l">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead, idx) => {
                const igStatus = lead.instagramStatus ?? "PENDING";
                const meta     = STATUS_META[igStatus] ?? STATUS_META.PENDING;
                const niche    = nicheBadge(lead.searchCategory);
                const rowBg    =
                  igStatus === "DM_SENT"  ? "bg-green-50 hover:bg-green-100" :
                  igStatus === "SKIPPED"  ? "bg-yellow-50 hover:bg-yellow-100" :
                  igStatus === "REPLIED"  ? "bg-purple-50 hover:bg-purple-100" :
                                            "hover:bg-pink-50";
                const igHandle = lead.instagramUrl
                  ? lead.instagramUrl.replace("https://www.instagram.com/", "@").replace(/\/$/, "")
                  : null;

                return (
                  <tr key={lead.id} className={`transition-colors ${rowBg}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>

                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline leading-tight block">
                        {lead.name}
                      </Link>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer"
                          className="text-[11px] text-gray-400 hover:text-blue-500 hover:underline truncate block max-w-[180px]">
                          {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "").split("?")[0].slice(0, 40)}
                        </a>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${niche.cls}`}>{niche.label}</span>
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        {lead.country && <span className="text-base leading-none">{countryFlag(lead.country)}</span>}
                        <span>{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {lead.instagramUrl ? (
                        <a
                          href={lead.instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-pink-600 hover:text-pink-800 hover:underline flex items-center gap-1"
                        >
                          <span>📸</span>
                          <span className="truncate max-w-[140px]">{igHandle}</span>
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${meta.cls}`}>
                          {meta.label}
                        </span>
                        {lead.instagramDmAt && (
                          <span className="text-[10px] text-gray-400">{fmtDate(lead.instagramDmAt)}</span>
                        )}
                      </div>
                    </td>

                    <td className="sticky right-0 bg-white border-l px-3 py-3 text-center">
                      {igStatus === "PENDING" && (
                        <div className="flex flex-col gap-1.5">
                          <button
                            disabled={updating[lead.id]}
                            onClick={() => setStatus(lead.id, "DM_SENT")}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 transition font-medium w-full"
                          >
                            📸 DM Sent
                          </button>
                          <button
                            disabled={updating[lead.id]}
                            onClick={() => setStatus(lead.id, "SKIPPED")}
                            className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1.5 rounded hover:bg-yellow-200 disabled:opacity-40 transition font-medium w-full"
                          >
                            ⏭ Skip
                          </button>
                        </div>
                      )}
                      {igStatus === "DM_SENT" && (
                        <div className="flex flex-col gap-1.5">
                          <button
                            disabled={updating[lead.id]}
                            onClick={() => setStatus(lead.id, "REPLIED")}
                            className="bg-purple-100 text-purple-700 text-xs px-3 py-1.5 rounded hover:bg-purple-200 disabled:opacity-40 transition font-medium w-full"
                          >
                            💬 Replied
                          </button>
                          <button
                            disabled={updating[lead.id]}
                            onClick={() => setStatus(lead.id, "PENDING")}
                            className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition w-full"
                          >
                            ↩ Undo
                          </button>
                        </div>
                      )}
                      {(igStatus === "SKIPPED" || igStatus === "REPLIED") && (
                        <button
                          disabled={updating[lead.id]}
                          onClick={() => setStatus(lead.id, "PENDING")}
                          className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition w-full"
                        >
                          ↩ Undo
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  );
}
