"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const PHASES = [
  { value: "1", label: "Phase 1 — Europe" },
  { value: "2", label: "Phase 2 — Dubai" },
  { value: "3", label: "Phase 3 — USA" },
];

const PHASE_TABS = [
  { value: "",  label: "All Phases", flag: "🌍" },
  { value: "1", label: "Phase 1 — Europe", flag: "🇪🇺" },
  { value: "2", label: "Phase 2 — Dubai",  flag: "🇦🇪" },
  { value: "3", label: "Phase 3 — USA",    flag: "🇺🇸" },
];

const DOMAINS = ["crm", "no_website", "health", "b2b", "tourism"];
const DOMAIN_LABELS: Record<string, string> = {
  crm: "Retail/CRM", no_website: "No Website",
  health: "Health", b2b: "B2B", tourism: "Tourism",
};
const COUNTRIES = [
  "Denmark","Norway","Netherlands","Ireland","Switzerland",
  "Sweden","Luxembourg","Estonia","Liechtenstein","Iceland",
];
const STATUSES = ["NEW","EMAILED","REPLIED","CONVERTED","NOT_INTERESTED"];
const STATUS_BADGE: Record<string, string> = {
  NEW:            "bg-gray-100 text-gray-600",
  EMAILED:        "bg-blue-100 text-blue-700",
  REPLIED:        "bg-yellow-100 text-yellow-700",
  CONVERTED:      "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-red-100 text-red-600",
};

type Lead = {
  id: number; name: string; category: string; city: string; country: string;
  domain: string; website: string; phone: string; status: string;
  _count: { notes: number; emailLogs: number };
};

const EMPTY_FORM = { name: "", category: "", phone: "", website: "", city: "", country: "", domain: "b2b", phase: "1", status: "NEW", linkedinUrl: "", instagramUrl: "", note: "" };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filters
  const [phase,    setPhase]    = useState("");
  const [domain,   setDomain]   = useState("");
  const [country,  setCountry]  = useState("");
  const [status,   setStatus]   = useState("");
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState("createdAt");
  const [sortDir,  setSortDir]  = useState("desc");

  // Column-level inline filters (client-side on current page)
  const [col, setCol] = useState({ name:"", domain:"", category:"", city:"", country:"", status:"", website:"", phone:"" });
  const setColFilter = (k: keyof typeof col, v: string) => setCol(c => ({ ...c, [k]: v }));

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), limit: "50",
      ...(phase   && { phase }),
      ...(domain  && { domain }),
      ...(country && { country }),
      ...(status  && { status }),
      ...(search  && { search }),
      sortBy, sortDir,
    });
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, phase, domain, country, status, search, sortBy, sortDir]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const totalPages = Math.ceil(total / 50);

  const q = (s: string) => s.toLowerCase();
  const visibleLeads = leads.filter(l =>
    (!col.name     || q(l.name).includes(q(col.name))) &&
    (!col.domain   || l.domain === col.domain) &&
    (!col.category || q(l.category ?? "").includes(q(col.category))) &&
    (!col.city     || q(l.city ?? "").includes(q(col.city))) &&
    (!col.country  || q(l.country ?? "").includes(q(col.country))) &&
    (!col.status   || l.status === col.status) &&
    (!col.website  || q(l.website ?? "").includes(q(col.website))) &&
    (!col.phone    || (l.phone ?? "").includes(col.phone))
  );

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError("");
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { setSaveError("Failed to save lead"); setSaving(false); return; }
    setShowAdd(false); setForm(EMPTY_FORM); fetchLeads();
    setSaving(false);
  }

  function sort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-gray-500 text-sm">{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setSaveError(""); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Lead
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <form onSubmit={handleAddLead} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Lead</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Taurai Valerie Mtake" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Language School" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Domain *</label>
                <select required value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">City</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Stockholm" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Country</label>
                <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Sweden" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Phase</label>
                <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+46…" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Website</label>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">LinkedIn URL</label>
                <input value={form.linkedinUrl} onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/…" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">First Note</label>
                <textarea rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Replied on LinkedIn, interested in web platform" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
            </div>

            {saveError && <p className="text-red-500 text-xs">{saveError}</p>}

            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                {saving ? "Saving…" : "Save Lead"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Phase tabs */}
      <div className="flex gap-1 border-b">
        {PHASE_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => { setPhase(t.value); setPage(1); }}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
              phase === t.value
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{t.flag}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, phone, website…"
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <Select value={domain} onChange={v => { setDomain(v); setPage(1); }} placeholder="All domains">
          {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
        </Select>
        <Select value={country} onChange={v => { setCountry(v); setPage(1); }} placeholder="All countries">
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={status} onChange={v => { setStatus(v); setPage(1); }} placeholder="All statuses">
          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </Select>
        {(domain || country || status || search) && (
          <button
            onClick={() => { setDomain(""); setCountry(""); setStatus(""); setSearch(""); setPage(1); setPhase(""); }}
            className="text-sm text-red-500 hover:underline px-2"
          >Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["name","Name"],["domain","Domain"],["category","Category"],
                  ["city","City"],["country","Country"],["status","Status"],
                  ["website","Website"],["phone","Phone"],
                ].map(([c, label]) => (
                  <th
                    key={c}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                    onClick={() => sort(c)}
                  >
                    {label}<SortIcon col={c} />
                  </th>
                ))}
                <th className="px-4 py-3 text-gray-400">Activity</th>
              </tr>
              <tr className="bg-white border-b">
                <td className="px-2 py-1.5">
                  <input value={col.name} onChange={e => setColFilter("name", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </td>
                <td className="px-2 py-1.5">
                  <select value={col.domain} onChange={e => setColFilter("domain", e.target.value)} className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                    <option value="">All</option>
                    {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={col.category} onChange={e => setColFilter("category", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={col.city} onChange={e => setColFilter("city", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={col.country} onChange={e => setColFilter("country", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </td>
                <td className="px-2 py-1.5">
                  <select value={col.status} onChange={e => setColFilter("status", e.target.value)} className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                    <option value="">All</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={col.website} onChange={e => setColFilter("website", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={col.phone} onChange={e => setColFilter("phone", e.target.value)} placeholder="Search…" className="w-full text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                </td>
                <td />
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No leads found</td></tr>
              ) : visibleLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {DOMAIN_LABELS[lead.domain] || lead.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{lead.category}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.city}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.country}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[lead.status]}`}>
                      {lead.status.replace("_"," ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate">
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">{lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{lead.phone || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {lead._count.notes > 0 && <span className="mr-2">📝 {lead._count.notes}</span>}
                    {lead._count.emailLogs > 0 && <span>✉️ {lead._count.emailLogs}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
            <span className="text-gray-500">
              Page {page} of {totalPages} · {total.toLocaleString()} leads
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded hover:bg-white disabled:opacity-40"
              >← Prev</button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded hover:bg-white disabled:opacity-40"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ value, onChange, placeholder, children }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}
