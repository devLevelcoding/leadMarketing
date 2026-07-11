"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface Lead {
  id: number;
  name: string;
  country_iso: string;
  industry: string;
  tier: string;
  website: string;
  phone: string;
  city: string;
  address: string;
  linkedin_url: string;
  google_maps_url: string;
  source: string;
  created_at: string;
}

interface ApiResponse {
  leads: Lead[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

const TIER_COLOR: Record<string, string> = {
  A: "bg-green-900 text-green-300",
  B: "bg-yellow-900 text-yellow-300",
  C: "bg-red-900 text-red-300",
};

const COUNTRIES = ["", "IT", "PL", "NL"];
const INDUSTRIES = ["", "Real Estate", "Construction", "IT & Software", "Logistics & Transport"];
const TIERS = ["", "A", "B", "C"];

export default function CrmLeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData]       = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const country  = searchParams.get("country")  || "";
  const industry = searchParams.get("industry") || "";
  const tier     = searchParams.get("tier")     || "";
  const q        = searchParams.get("q")        || "";
  const page     = parseInt(searchParams.get("page") || "1");

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete("page");
    router.push(`/admin/crm/leads?${p.toString()}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ country, industry, tier, q, page: String(page) });
      const res = await fetch(`/api/crm/leads?${p}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [country, industry, tier, q, page]);

  useEffect(() => { load(); }, [load]);

  const INPUT = "bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const SELECT = INPUT;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/crm" className="hover:text-blue-400 transition-colors">CRM Intel</Link>
            <span>/</span>
            <span>Leads</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Leads
            {data && <span className="text-gray-500 font-normal text-lg ml-2">({data.total.toLocaleString()})</span>}
          </h1>
        </div>
        {data && data.total > 0 && (
          <a
            href={`/api/crm/leads/export?country=${country}&industry=${encodeURIComponent(industry)}&tier=${tier}&q=${q}`}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Export CSV
          </a>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search name, city, website..."
          value={q}
          onChange={e => setParam("q", e.target.value)}
          className={`${INPUT} w-64`}
        />
        <select value={country} onChange={e => setParam("country", e.target.value)} className={SELECT}>
          <option value="">All countries</option>
          {COUNTRIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={industry} onChange={e => setParam("industry", e.target.value)} className={SELECT}>
          <option value="">All industries</option>
          {INDUSTRIES.filter(Boolean).map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={tier} onChange={e => setParam("tier", e.target.value)} className={SELECT}>
          <option value="">All tiers</option>
          {TIERS.filter(Boolean).map(t => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        {(country || industry || tier || q) && (
          <button
            onClick={() => router.push("/admin/crm/leads")}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading && (
          <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>
        )}
        {!loading && data && data.leads.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <p className="text-lg mb-2">No leads found</p>
            <p className="text-sm">Try adjusting your filters or wait for the pipeline to finish.</p>
          </div>
        )}
        {!loading && data && data.leads.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Industry</th>
                  <th className="text-left px-4 py-3">Tier</th>
                  <th className="text-left px-4 py-3">City</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Website</th>
                  <th className="text-left px-4 py-3">LinkedIn</th>
                  <th className="text-left px-4 py-3">Maps</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate" title={lead.name}>
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-400 text-xs">{lead.country_iso}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.industry}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLOR[lead.tier] || "bg-gray-800 text-gray-400"}`}>
                        {lead.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.city || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.phone || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer"
                           className="text-blue-400 hover:text-blue-300 truncate block max-w-[140px]" title={lead.website}>
                          {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                        </a>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {lead.linkedin_url ? (
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                           className="text-blue-400 hover:text-blue-300">
                          LinkedIn
                        </a>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {lead.google_maps_url ? (
                        <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer"
                           className="text-gray-400 hover:text-white">
                          Maps
                        </a>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => setParam("page", String(page - 1))}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition-colors"
              >
                Previous
              </button>
            )}
            {page < data.pages && (
              <button
                onClick={() => setParam("page", String(page + 1))}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
