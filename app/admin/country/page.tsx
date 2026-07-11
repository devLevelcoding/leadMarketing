"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Pagination from "@/components/ui/Pagination";
import { countryFlag, fmtDate, DOMAIN_LABEL, DOMAIN_COLOR } from "@/lib/leadUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailLog = { id: number; sentAt: string; subject: string; status: string };
type Lead = {
  id: number; name: string; domain: string; category: string | null;
  phase: number; phone: string | null; website: string | null;
  city: string | null; country: string | null; rating: string | null; status: string;
  emailLogs: EmailLog[];
};

// ─── Country / timezone data ──────────────────────────────────────────────────

const COUNTRY_TZ: { country: string; tz: string; flag: string; phase: number }[] = [
  { country: "Romania",     tz: "Europe/Bucharest",   flag: "🇷🇴", phase: 1 },
  { country: "Germany",     tz: "Europe/Berlin",      flag: "🇩🇪", phase: 4 },
  { country: "Austria",     tz: "Europe/Vienna",      flag: "🇦🇹", phase: 4 },
  { country: "Switzerland", tz: "Europe/Zurich",      flag: "🇨🇭", phase: 4 },
  { country: "Belgium",     tz: "Europe/Brussels",    flag: "🇧🇪", phase: 4 },
  { country: "Netherlands", tz: "Europe/Amsterdam",   flag: "🇳🇱", phase: 4 },
  { country: "Sweden",      tz: "Europe/Stockholm",   flag: "🇸🇪", phase: 4 },
  { country: "Norway",      tz: "Europe/Oslo",        flag: "🇳🇴", phase: 4 },
  { country: "Denmark",     tz: "Europe/Copenhagen",  flag: "🇩🇰", phase: 4 },
  { country: "Italy",       tz: "Europe/Rome",        flag: "🇮🇹", phase: 5 },
  { country: "Spain",       tz: "Europe/Madrid",      flag: "🇪🇸", phase: 5 },
  { country: "Portugal",    tz: "Europe/Lisbon",      flag: "🇵🇹", phase: 5 },
  { country: "Ireland",     tz: "Europe/Dublin",      flag: "🇮🇪", phase: 1 },
  { country: "Iceland",     tz: "Atlantic/Reykjavik", flag: "🇮🇸", phase: 1 },
  { country: "Estonia",     tz: "Europe/Tallinn",     flag: "🇪🇪", phase: 1 },
  { country: "Luxembourg",  tz: "Europe/Luxembourg",  flag: "🇱🇺", phase: 1 },
  { country: "UAE",         tz: "Asia/Dubai",         flag: "🇦🇪", phase: 2 },
  { country: "USA",         tz: "America/New_York",   flag: "🇺🇸", phase: 3 },
];

function sendStatus(hour: number, minute: number, isWeekend: boolean) {
  if (isWeekend) return { dot: "🔴", label: "Weekend", good: false };
  const t = hour + minute / 60;
  if (t >= 9 && t < 18)  return { dot: "🟢", label: "Good",       good: true };
  if ((t >= 7 && t < 9) || (t >= 18 && t < 20))
                          return { dot: "🟡", label: "Early/Late", good: true };
  return                         { dot: "🔴", label: "Sleeping",   good: false };
}

// ─── Email helpers ────────────────────────────────────────────────────────────

function emailStatusColor(status: string) {
  switch (status) {
    case "SENT":    return "bg-blue-100 text-blue-700";
    case "OPENED":  return "bg-green-100 text-green-700";
    case "REPLIED": return "bg-purple-100 text-purple-700";
    case "BOUNCED": return "bg-red-100 text-red-600";
    default:        return "bg-gray-100 text-gray-500";
  }
}

function buildCopyText(lead: Lead): string {
  const lines = [
    `${lead.name}  ·  ${DOMAIN_LABEL[lead.domain] ?? lead.domain}`,
    lead.category ? `Category : ${lead.category}` : null,
    [lead.city, lead.country].filter(Boolean).join(", ")
      ? `Location : ${[lead.city, lead.country].filter(Boolean).join(", ")}` : null,
    lead.phone   ? `Phone    : ${lead.phone}` : null,
    lead.website ? `Website  : ${lead.website}` : null,
    lead.rating  ? `Rating   : ${lead.rating} ★` : null,
    lead.emailLogs.length > 0
      ? `Emails   : ${lead.emailLogs.length} sent  (last: ${lead.emailLogs[0].status} · ${fmtDate(lead.emailLogs[0].sentAt)})`
      : `Emails   : none yet`,
  ].filter(Boolean);
  return lines.join("\n");
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function CountryPage() {
  return <Suspense><CountryPageInner /></Suspense>;
}

function CountryPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selected = searchParams.get("country") ?? "";

  function selectCountry(c: string) {
    router.push(`/country?country=${encodeURIComponent(c)}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">🌍 Country Campaign</h1>
        <p className="text-gray-500 text-sm mt-1">Select a country to see all leads — email history included</p>
      </div>

      <CountryPicker selected={selected} onSelect={selectCountry} />

      {selected && <CountryLeadsGrid country={selected} />}
    </div>
  );
}

// ─── Country Clock Picker ─────────────────────────────────────────────────────

function CountryPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Best Time to Send</h2>
        <span className="text-xs text-gray-400">updates every 30s · 🟢 9–18h · 🟡 7–9 / 18–20h · 🔴 night/weekend</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {COUNTRY_TZ.map(({ country, tz, flag, phase }) => {
          const local   = new Date(now.toLocaleString("en-US", { timeZone: tz }));
          const h = local.getHours();
          const m = local.getMinutes();
          const weekend = local.getDay() === 0 || local.getDay() === 6;
          const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const { dot, label, good } = sendStatus(h, m, weekend);

          const isSelected = selected === country;
          const borderClass = isSelected
            ? "ring-2 ring-blue-500 border-blue-400"
            : good
              ? "border-green-200 bg-green-50 hover:border-green-400"
              : label === "Sleeping"
                ? "border-red-100 bg-red-50"
                : "border-yellow-200 bg-yellow-50 hover:border-yellow-400";

          return (
            <div
              key={country}
              onClick={() => onSelect(country)}
              className={`rounded-lg border px-3 py-2 cursor-pointer transition-all ${borderClass} ${isSelected ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base leading-none">{flag}</span>
                <span className="text-xs font-medium truncate flex-1">{country}</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{timeStr}</div>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-xs text-gray-500">{dot} {label}</span>
                <span className="flex gap-1">
                  <a
                    href={`/warmup?phase=${phase}`}
                    onClick={e => e.stopPropagation()}
                    title="Email warmup"
                    className="text-xs opacity-60 hover:opacity-100 leading-none"
                  >📧</a>
                  <a
                    href={`/whatsapp?phase=${phase}`}
                    onClick={e => e.stopPropagation()}
                    title="WhatsApp campaign"
                    className="text-xs opacity-60 hover:opacity-100 leading-none"
                  >💬</a>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leads Grid ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function CountryLeadsGrid({ country }: { country: string }) {
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [contactedFilter, setContactedFilter] = useState<"all" | "sent" | "skipped" | "fresh">("all");
  const [updating, setUpdating] = useState<Record<number, boolean>>({});

  async function onStatus(id: number, status: string) {
    setUpdating(u => ({ ...u, [id]: true }));
    try {
      const res = await fetch(`/api/country/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { lead: updated } = await res.json();
        setLeads(ls => ls.map(l => l.id === id ? { ...l, status: updated.status } : l));
      }
    } finally {
      setUpdating(u => { const n = { ...u }; delete n[id]; return n; });
    }
  }

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetch(`/api/country/leads?country=${encodeURIComponent(country)}`)
      .then(r => r.json())
      .then(d => { setLeads(d.leads ?? []); setLoading(false); });
  }, [country]);

  const flag = countryFlag(country);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.name.toLowerCase().includes(q)
      || (l.category ?? "").toLowerCase().includes(q)
      || (l.city ?? "").toLowerCase().includes(q);
    const matchDomain = !domainFilter || l.domain === domainFilter;
    const matchContacted =
      contactedFilter === "all"     ? true :
      contactedFilter === "sent"    ? l.status === "SENT" :
      contactedFilter === "skipped" ? l.status === "SKIPPED" :
                                      l.status !== "SENT" && l.status !== "SKIPPED";
    return matchSearch && matchDomain && matchContacted;
  });

  const sorted = [...filtered].sort((a, b) => {
    const rank = (s: string) => s === "SENT" || s === "SKIPPED" ? 1 : 0;
    return rank(a.status) - rank(b.status);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const contacted = leads.filter(l => l.emailLogs.length > 0).length;
  const sent      = leads.filter(l => l.status === "SENT").length;
  const skipped   = leads.filter(l => l.status === "SKIPPED").length;
  const domains   = Array.from(new Set(leads.map(l => l.domain))).sort();

  const pending = leads.length - sent - skipped;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">{flag}</span>
          {country}
          <span className="text-sm font-normal text-gray-400 ml-1">{leads.length} leads total · 📧 {contacted} emailed via warmup</span>
        </h2>
      </div>

      {/* Campaign summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-4">
          <span className="text-3xl font-bold text-green-700">{sent}</span>
          <div>
            <p className="text-sm font-semibold text-green-800">✓ Sent</p>
            <p className="text-xs text-green-600">marked as sent</p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 flex items-center gap-4">
          <span className="text-3xl font-bold text-yellow-700">{skipped}</span>
          <div>
            <p className="text-sm font-semibold text-yellow-800">⏭ Skipped</p>
            <p className="text-xs text-yellow-600">not relevant</p>
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
          <span className="text-3xl font-bold text-gray-700">{pending}</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">○ Pending</p>
            <p className="text-xs text-gray-500">not yet actioned</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, category, city…"
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-56"
        />
        <select
          value={domainFilter}
          onChange={e => { setDomainFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          <option value="">All segments</option>
          {domains.map(d => <option key={d} value={d}>{DOMAIN_LABEL[d] ?? d}</option>)}
        </select>
        <div className="flex gap-1">
          {(["all", "sent", "skipped", "fresh"] as const).map(v => (
            <button
              key={v}
              onClick={() => { setContactedFilter(v); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                contactedFilter === v
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {v === "all" ? "All" : v === "sent" ? "✓ Sent" : v === "skipped" ? "⏭ Skipped" : "○ Fresh"}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
          <p className="text-lg font-medium mb-1">No leads found for {country}</p>
          <p className="text-sm">Import leads for this country first via the Leads section.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Segment</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">City</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Website</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Email History</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs">Actions</th>
                  <th className="sticky right-0 bg-gray-50 border-l px-4 py-3 font-medium text-gray-600 text-xs text-right">Send / Skip</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((lead, idx) => (
                  <CountryLeadRow
                    key={lead.id}
                    index={(page - 1) * PAGE_SIZE + idx + 1}
                    lead={lead}
                    busy={!!updating[lead.id]}
                    onStatus={onStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
      )}
    </div>
  );
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────

function CountryLeadRow({ index, lead, busy, onStatus }: {
  index: number; lead: Lead; busy: boolean; onStatus: (id: number, s: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const lastLog = lead.emailLogs[0];

  const rowBg =
    lead.status === "SENT"    ? "bg-green-50 hover:bg-green-100" :
    lead.status === "SKIPPED" ? "bg-yellow-50 hover:bg-yellow-100" :
    lead.emailLogs.length > 0 ? "bg-blue-50/40 hover:bg-blue-50" :
                                "hover:bg-gray-50";
  const stickyBg =
    lead.status === "SENT"    ? "bg-green-50" :
    lead.status === "SKIPPED" ? "bg-yellow-50" :
    lead.emailLogs.length > 0 ? "bg-blue-50" :
                                "bg-white";

  function copyLead() {
    navigator.clipboard.writeText(buildCopyText(lead));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const waPhone = lead.phone?.replace(/[\s\-().]/g, "");

  return (
    <>
      <tr className={`transition-colors ${rowBg}`}>
        <td className="px-4 py-3 text-gray-400 text-xs">{index}</td>
        <td className="px-4 py-3">
          <Link href={`/leads/${lead.id}`} className="font-medium text-blue-700 hover:underline text-sm">{lead.name}</Link>
          {lead.category && <p className="text-xs text-gray-400 truncate max-w-[160px]">{lead.category}</p>}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${DOMAIN_COLOR[lead.domain] ?? "bg-gray-100 text-gray-600"}`}>
            {DOMAIN_LABEL[lead.domain] ?? lead.domain}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{lead.city || "—"}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span>{lead.phone || "—"}</span>
            {lead.phone && !lead.website && (
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noreferrer"
                title="Open in WhatsApp"
                className="text-green-500 hover:text-green-600 flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.523 5.854L.057 23.527a.75.75 0 0 0 .916.916l5.673-1.466A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.695 9.695 0 0 1-4.945-1.355l-.355-.21-3.668.948.968-3.558-.23-.368A9.699 9.699 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
              </a>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs max-w-[130px] truncate">
          {lead.website
            ? <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{lead.rating ?? "—"}</td>
        <td className="px-4 py-3 text-xs">
          {lead.emailLogs.length > 0 ? (
            <div>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${emailStatusColor(lastLog.status)}`}>{lastLog.status}</span>
              <span className="text-gray-400 ml-1">{fmtDate(lastLog.sentAt)}</span>
              {lead.emailLogs.length > 1 && (
                <span className="text-gray-400 ml-1">+{lead.emailLogs.length - 1} more</span>
              )}
            </div>
          ) : (
            <span className="text-gray-300">No emails yet</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={copyLead}
              className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded hover:bg-green-200 transition font-medium"
            >
              {copied ? "Copied!" : "Copy Lead"}
            </button>
            <button
              onClick={() => setEmailOpen(true)}
              className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded hover:bg-blue-200 transition font-medium"
            >
              Email
            </button>
            <a
              href={`https://www.google.com/search?q=site:linkedin.com/in+"${encodeURIComponent(lead.name)}"${lead.city ? `+"${encodeURIComponent(lead.city)}"` : ""}+owner+OR+founder+OR+manager`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 transition font-medium"
              title="Find on LinkedIn"
            >
              LinkedIn
            </a>
          </div>
        </td>
        <td className={`sticky right-0 border-l px-3 py-3 ${stickyBg}`}>
          <div className="flex gap-1.5 items-center justify-end">
            {lead.status !== "SENT" && lead.status !== "SKIPPED" ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => onStatus(lead.id, "SENT")}
                  className="text-xs px-2.5 py-1 rounded font-medium bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50"
                >✓ Sent</button>
                <button
                  disabled={busy}
                  onClick={() => onStatus(lead.id, "SKIPPED")}
                  className="text-xs px-2.5 py-1 rounded font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition disabled:opacity-50"
                >⏭ Skip</button>
              </>
            ) : (
              <button
                disabled={busy}
                onClick={() => onStatus(lead.id, "NEW")}
                className="text-xs px-2.5 py-1 rounded font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50"
              >↩ Undo</button>
            )}
          </div>
        </td>
      </tr>

      {/* Email modal */}
      {emailOpen && (
        <EmailModal
          lead={lead}
          copied={emailCopied}
          onCopy={() => { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 1500); }}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function buildEmail(lead: Lead): { subject: string; body: string } {
  const location = [lead.city, lead.country].filter(Boolean).join(", ");
  const site = lead.website?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null;

  const subjects: Record<string, string> = {
    crm:        `Grow your customer base — CRM & Digital Solutions for ${lead.name}`,
    no_website: `Get online and grow — Web Presence & Digital Strategy for ${lead.name}`,
    health:     `Digital Growth for Health & Wellness — ${lead.name} | LevelCoding`,
    b2b:        `Technical Partnership Opportunity — ${lead.name} | LevelCoding`,
    tourism:    `More Bookings, Higher Revenue — Digital Solutions for ${lead.name}`,
  };

  const subject = subjects[lead.domain] ?? subjects.crm;

  const body = `Dear ${lead.name} Team,

Hello,

My name is Marian Pirvan and I represent LevelCoding, a European IT-services firm based in Romania. We specialize in high-performance web development, mobile solutions, CRM systems, and platform integrations for businesses across Europe.

We are reaching out to the ${location || "your"} team because ${lead.name} represents exactly the kind of business that benefits most from a modern digital presence${site ? ` — and we noticed ${site} has room for meaningful technical improvements that could directly impact your customer acquisition and retention` : ", and we believe there are concrete opportunities to help you grow online"}.

We build fast, professional websites, custom CRM solutions, and booking platforms for local businesses — clean design, fully mobile-optimised, and structured to rank on Google from day one. Most of our clients see measurable results within the first 60 days after launch.

As a European partner based in Romania, we offer the technical depth of a senior engineering team at a cost structure that makes very clear business sense compared to local agencies in ${lead.country ?? "your region"}.

I would love to schedule a brief 15-minute call to share a few specific ideas we have for ${lead.name}. No commitment — just a conversation.

You can book a time directly here: https://consulting.levelcoding.com/book/3

Best regards,
Marian Pirvan
LevelCoding
Phone: +40 746 628 424
Email: marian@outreach.levelcoding.com`;

  return { subject, body };
}

function EmailModal({ lead, copied, onCopy, onClose }: {
  lead: Lead; copied: boolean; onCopy: () => void; onClose: () => void;
}) {
  const { subject, body } = buildEmail(lead);

  return (
    <tr>
      <td colSpan={10} className="p-0">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Email Draft — {lead.name}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Subject</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2">{subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Body</p>
                <pre className="text-sm text-gray-800 bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap font-sans">{body}</pre>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 transition">Close</button>
              <button
                onClick={() => { navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); onCopy(); }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                {copied ? "Copied!" : "Copy Email"}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
