"use client";

import { Fragment, useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { buildSalesEmail, type SiteScan } from "@/lib/salesEmail";

interface AiLead {
  id: number;
  name: string;
  country: string;
  city: string | null;
  industry: string;
  reviews: number | null;
  rating: number | null;
  website: string | null;
  phone: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  fit: number;
  confidence: string;
  email: string | null;
  summary: string;
  pain_points: string[];
  needs: string[];
  subject: string;
  message: string;
  dm: string;
  analyzed_at: string;
  state: "SENT" | "SKIPPED" | "CAMPAIGN" | null;
}

interface ApiResponse {
  leads: AiLead[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  stats: {
    analyzed: number; with_email: number; hot: number; avg_fit: number;
    total_analyzed: number; emails_total: number;
    todo: number; sent: number; skipped: number; campaign: number;
  };
  countries: { country: string; n: number }[];
  industries: { industry: string; n: number }[];
  error?: string;
}

const SORTS = [
  ["fit", "Best fit"], ["reviews", "Most reviews"], ["rating", "Top rated"],
  ["newest", "Newest analyzed"], ["name", "Name A–Z"],
] as const;

/** 1 … 4 5 [6] 7 8 … 20 */
function pageList(page: number, pages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}

function Pager({ page, pages, total, pageSize, go }: {
  page: number; pages: number; total: number; pageSize: number; go: (p: number) => void;
}) {
  if (!total) return null;
  const btn = "min-w-[2.25rem] px-2.5 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-default";
  const idle = `${btn} bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700`;
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-gray-500">
      <span>
        Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button disabled={page <= 1} onClick={() => go(page - 1)} className={idle}>‹ Prev</button>
          {pageList(page, pages).map((p, i) => p === "…"
            ? <span key={`e${i}`} className="px-1 text-gray-600">…</span>
            : <button key={p} onClick={() => go(p)}
                className={p === page ? `${btn} bg-blue-600 border-blue-500 text-white` : idle}>{p}</button>)}
          <button disabled={page >= pages} onClick={() => go(page + 1)} className={idle}>Next ›</button>
        </div>
      )}
    </div>
  );
}

const INPUT = "bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function fitColor(fit: number) {
  if (fit >= 70) return "bg-green-900 text-green-300";
  if (fit >= 40) return "bg-yellow-900 text-yellow-300";
  return "bg-red-900 text-red-300";
}

// Webmail (cPanel Roundcube). Its URL holds the cPanel session id, which changes at every
// login: paste a fresh one with "⚙️ Webmail" (saved in this browser), default NEXT_PUBLIC_WEBMAIL_URL.
const WEBMAIL_KEY = "aiLeads.webmailUrl";

/** ".../cpsess123/3rdparty/roundcube/?_task=mail&_mbox=INBOX" -> ".../cpsess123/3rdparty/roundcube/" */
function webmailBase(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const i = u.pathname.indexOf("/roundcube/");
    return i < 0 ? null : u.origin + u.pathname.slice(0, i + "/roundcube/".length);
  } catch {
    return null;
  }
}

/** Compose screen with address, subject and message filled in: webmail if set, else the email app. */
function mailto(l: AiLead, webmail: string | null, mail: { subject: string; body: string } = { subject: l.subject, body: l.message }) {
  const to = encodeURIComponent(l.email ?? ""), subject = encodeURIComponent(mail.subject),
        body = encodeURIComponent(mail.body);
  return webmail
    ? `${webmail}?_task=mail&_action=compose&_to=${to}&_subject=${subject}&_body=${body}`
    : `mailto:${l.email}?subject=${subject}&body=${body}`;
}

function scoreColor(n: number) {
  return n >= 70 ? "text-green-300" : n >= 40 ? "text-yellow-300" : "text-red-300";
}

// The email column of an open lead: Lighthouse audit of the site (scanned on first open)
// and the long sales email built from it, or the agent's short original.
function EmailPanel({ l, webmail, onDone }: { l: AiLead; webmail: string | null; onDone: () => void }) {
  const [scan, setScan] = useState<SiteScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [style, setStyle] = useState<"sales" | "short">("sales");

  const runScan = useCallback(async () => {
    setScanning(true); setScanError(null);
    try {
      const r = await fetch(`/api/ai-leads/${l.id}/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: l.website }),
      }).then(r => r.json());
      if (r.error) setScanError(r.error); else setScan(r.scan);
    } catch (e) {
      setScanError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }, [l.id, l.website]);

  useEffect(() => {
    let live = true;
    fetch(`/api/ai-leads/${l.id}/audit`).then(r => r.json()).then(r => {
      if (!live) return;
      if (r.scan) setScan(r.scan);
      else if (l.website) runScan();
    }).catch(() => {});
    return () => { live = false; };
  }, [l.id, l.website, runScan]);

  const mail = style === "sales" ? buildSalesEmail(l, scan) : { subject: l.subject, body: l.message };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-gray-500">📧 Email</div>
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
          {([["sales", "📈 Sales + audit"], ["short", "✂️ Short"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setStyle(k)}
              className={`px-2.5 py-1 ${style === k ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg px-3 py-2 text-xs flex items-center gap-4 flex-wrap">
        <span className="text-gray-500">🔍 Site audit</span>
        {scanning && <span className="text-gray-400">Scanning {l.website?.split(";")[0]}…</span>}
        {!scanning && scan && !scan.error && (
          <>
            <span>🔒 Security <b className={scoreColor(scan.secScore)}>{scan.secScore}</b></span>
            <span>🔎 SEO <b className={scoreColor(scan.seoScore)}>{scan.seoScore}</b></span>
            <span>📊 Tracking <b className={scoreColor(scan.semScore)}>{scan.semScore}</b></span>
          </>
        )}
        {!scanning && scan?.error && <span className="text-yellow-300" title={scan.error}>Site didn't respond, so the email uses the AI analysis only</span>}
        {!scanning && scanError && <span className="text-yellow-300">{scanError}</span>}
        {!scanning && !scan && !scanError && !l.website && <span className="text-gray-500">No website</span>}
        {l.website && (
          <button onClick={runScan} disabled={scanning}
            className="ml-auto text-gray-400 hover:text-white disabled:opacity-50">↻ Rescan</button>
        )}
      </div>

      <div className="text-white text-sm font-medium">{mail.subject}</div>
      <pre className="whitespace-pre-wrap text-gray-300 text-xs bg-gray-900 rounded-lg p-3 font-sans max-h-96 overflow-y-auto">{mail.body}</pre>
      <div className="flex gap-2 flex-wrap">
        {l.email && <a href={mailto(l, webmail, mail)} target={webmail ? "_blank" : undefined} rel="noopener noreferrer"
           className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
          ✉️ {webmail ? "Open in webmail" : "Open in email app"}</a>}
        {l.email && <CopyButton text={l.email} label="Copy address" />}
        <CopyButton text={mail.subject} label="Copy subject" />
        <CopyButton text={mail.body} label="Copy email" />
        <StatusButtons l={l} onDone={onDone} />
      </div>
    </div>
  );
}

// No profile link in the CRM: search for the company instead.
function searchInstagram(l: AiLead) {
  return `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com "${l.name}" ${l.city ?? ""}`)}`;
}
function searchLinkedIn(l: AiLead) {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(l.name)}`;
}

const STATE_BADGE: Record<string, [string, string]> = {
  SENT:     ["✅ Sent", "bg-green-900 text-green-300"],
  SKIPPED:  ["⏭ Skipped", "bg-gray-800 text-gray-400"],
  CAMPAIGN: ["📬 In CRM campaign", "bg-blue-900 text-blue-300"],
};

// Sent / Skip like the warm-up batches; Undo puts the lead back in "To send".
function StatusButtons({ l, onDone }: { l: AiLead; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const set = async (status: string) => {
    setBusy(true);
    try {
      await fetch(`/api/ai-leads/${l.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  const btn = "text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50";
  if (l.state === "CAMPAIGN") {
    return <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_BADGE.CAMPAIGN[1]}`}
                 title="This company is already in a warm-up / WhatsApp / Instagram campaign in the CRM">{STATE_BADGE.CAMPAIGN[0]}</span>;
  }
  if (l.state) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_BADGE[l.state][1]}`}>{STATE_BADGE[l.state][0]}</span>
        <button disabled={busy} onClick={() => set("NEW")}
          className={`${btn} bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700`}>↩ Undo</button>
      </span>
    );
  }
  return (
    <span className="inline-flex gap-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
      <button disabled={busy} onClick={() => set("SENT")} title="Mark as sent (CRM lead becomes EMAILED)"
        className={`${btn} bg-green-900/60 border-green-800 text-green-300 hover:bg-green-800`}>✅ Sent</button>
      <button disabled={busy} onClick={() => set("SKIPPED")} title="Skip: hide from AI Leads"
        className={`${btn} bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700`}>⏭ Skip</button>
    </span>
  );
}

// LinkedIn has no follow-as-Page link, and automating it risks the account: copy the
// name and open the Page's "Manage following" search, the follow click stays manual.
const LC_FOLLOWING = "https://www.linkedin.com/company/106952431/admin/feed/following/?manageFollowing=true";

// "Soul Senses Spa - Downtown, Abu Dhabi - مساج" -> "Soul Senses Spa": LinkedIn's search
// finds the brand, not the Google Maps listing name.
function linkedInName(name: string) {
  return name.split(/\s+[-–|·]\s+|\s*\(/)[0].trim() || name;
}

function FollowButton({ name: fullName, small }: { name: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  const name = linkedInName(fullName);
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        navigator.clipboard.writeText(name);
        // Named tab: every lead reuses the same LinkedIn tab instead of opening a new one.
        window.open(LC_FOLLOWING, "lc-linkedin-follow");
        setDone(true); setTimeout(() => setDone(false), 6000);
      }}
      title={`Copies "${name}" and opens Level Coding's "Gestionați urmăririle". There: click "Adăugați pagini de urmărit", Ctrl+V, pick the company, Urmăriți`}
      className={`text-xs ${small ? "px-2 py-0.5" : "px-3 py-1.5"} rounded-lg border transition-colors whitespace-nowrap ${
        done ? "bg-green-900 border-green-700 text-green-300"
             : "bg-sky-900/50 border-sky-800 text-sky-300 hover:bg-sky-800"}`}
    >
      {done ? `📋 Ctrl+V in "Adăugați pagini de urmărit": ${name}` : "➕ Follow as LevelCoding"}
    </button>
  );
}

function CopyNameButton({ name: fullName }: { name: string }) {
  const [done, setDone] = useState(false);
  const name = linkedInName(fullName);
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        navigator.clipboard.writeText(name);
        setDone(true); setTimeout(() => setDone(false), 1500);
      }}
      title={`Copy "${name}"`}
      className={`text-xs px-2 py-0.5 rounded-lg border transition-colors whitespace-nowrap ${
        done ? "bg-green-900 border-green-700 text-green-300"
             : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"}`}
    >
      {done ? "✅ Copied" : "📋 Name"}
    </button>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        done ? "bg-green-900 border-green-700 text-green-300"
             : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"}`}
    >
      {done ? "✅ Copied" : `📋 ${label}`}
    </button>
  );
}

function Icon({ href, title, children, off }: { href?: string; title: string; children: React.ReactNode; off?: boolean }) {
  if (off || !href) {
    return <span title={title} className="opacity-25 grayscale cursor-default">{children}</span>;
  }
  return (
    <a href={href} target={href.startsWith("mailto:") || href.startsWith("tel:") ? undefined : "_blank"}
       rel="noopener noreferrer" title={title} className="hover:scale-125 transition-transform inline-block"
       onClick={e => e.stopPropagation()}>
      {children}
    </a>
  );
}

function AiLeadsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [webmail, setWebmail] = useState<string | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(WEBMAIL_KEY); } catch {}
    setWebmail(webmailBase(saved || process.env.NEXT_PUBLIC_WEBMAIL_URL || ""));
  }, []);

  function editWebmail() {
    const url = window.prompt(
      "Paste your webmail URL (Roundcube, copy it from the browser address bar).\nEmpty = default.",
      webmail || "");
    if (url === null) return;
    const base = webmailBase(url.trim() || process.env.NEXT_PUBLIC_WEBMAIL_URL || "");
    if (url.trim() && !base) { alert("That's not a Roundcube URL (…/3rdparty/roundcube/…)."); return; }
    try { url.trim() && base ? localStorage.setItem(WEBMAIL_KEY, base) : localStorage.removeItem(WEBMAIL_KEY); } catch {}
    setWebmail(base);
  }

  const channel = sp.get("channel") || "email";   // email | dm
  const view    = sp.get("view") === "done" ? "done" : "todo";
  const country = sp.get("country") || "";
  const minFit  = sp.get("minFit") || "";
  const industry = sp.get("industry") || "";
  const sort    = sp.get("sort") || "";
  const q       = sp.get("q") || "";
  const page    = parseInt(sp.get("page") || "1");

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value); else p.delete(key);
    if (key !== "page") p.delete("page");
    router.push(`/admin/ai-leads?${p.toString()}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // A search looks through every lead: To send and Done, with or without email.
      const p = new URLSearchParams(q.trim()
        ? { email: "", view: "all", country, industry, sort, minFit, q: q.trim(), page: String(page) }
        : { email: channel === "email" ? "yes" : "no", view, country, industry, sort, minFit, q, page: String(page) });
      const res = await fetch(`/api/ai-leads?${p}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [channel, view, country, industry, sort, minFit, q, page]);

  const goPage = (p: number) => { setParam("page", p > 1 ? String(p) : ""); window.scrollTo({ top: 0 }); };

  useEffect(() => { load(); }, [load]);

  const s = data?.stats;
  const tabs = [
    { key: "email", label: "📧 Email ready", n: s?.with_email ?? 0 },
    { key: "dm",    label: "💬 DM — Instagram / LinkedIn", n: s ? s.analyzed - (s.with_email ?? 0) : 0 },
  ];

  return (
    // Wider than the admin layout's max-w-7xl: the table has many action buttons.
    <div className="space-y-6 relative left-1/2 -translate-x-1/2 w-[min(1840px,calc(100vw-3rem))]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Leads</h1>
          <p className="text-sm text-gray-500">
            Personal messages written by the AI lead agent. Mark each one ✅ Sent or ⏭ Skip; companies already in a CRM campaign move to Done.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={editWebmail} title={webmail ? `Emails open in ${webmail}` : "Emails open in your email app"}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">
            ⚙️ Webmail {webmail ? "✓" : "off"}
          </button>
          <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">
            ↻ Refresh
          </button>
        </div>
      </div>

      {data?.error && (
        <div className="bg-yellow-900/40 border border-yellow-800 text-yellow-200 rounded-xl p-4 text-sm">{data.error}</div>
      )}

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Analyzed", s.total_analyzed],
            ["📧 With email (goal 1,000)", s.emails_total],
            ["📤 To send", s.todo],
            ["✅ Sent", s.sent],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{(value ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Channel tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setParam("channel", t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              channel === t.key ? "border-blue-400 text-blue-400 font-semibold"
                                : "border-transparent text-gray-400 hover:text-gray-200"}`}>
            {t.label} <span className="text-gray-500">({t.n.toLocaleString()})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm">
          {([["todo", `📤 To send (${s?.todo ?? 0})`],
             ["done", `✔ Done (${s ? s.sent + s.skipped + s.campaign : 0})`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setParam("view", k === "todo" ? "" : k)}
              className={`px-3 py-2 ${view === k ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search name, email, phone, website, city, #id…" value={q}
          title="Searches all leads: To send and Done, Email and DM tabs"
          onChange={e => setParam("q", e.target.value)} className={`${INPUT} w-72`} />
        <select value={country} onChange={e => setParam("country", e.target.value)} className={INPUT}>
          <option value="">All countries</option>
          {data?.countries?.map(c => <option key={c.country} value={c.country}>{c.country} ({c.n})</option>)}
        </select>
        <select value={industry} onChange={e => setParam("industry", e.target.value)} className={`${INPUT} max-w-[260px]`}
          title="Show one industry, or all">
          <option value="">All industries</option>
          {industry && !data?.industries?.some(i => i.industry === industry) && <option value={industry}>{industry}</option>}
          {data?.industries?.map(i => <option key={i.industry} value={i.industry}>{i.industry} ({i.n})</option>)}
        </select>
        <select value={sort} onChange={e => setParam("sort", e.target.value)} className={INPUT} title="Order of the leads">
          {SORTS.map(([k, label]) => <option key={k} value={k === "fit" ? "" : k}>↕ {label}</option>)}
        </select>
        <select value={minFit} onChange={e => setParam("minFit", e.target.value)} className={INPUT}>
          <option value="">Any fit</option>
          <option value="70">🔥 Fit 70+</option>
          <option value="50">Fit 50+</option>
        </select>
        {q.trim() && data && !data.error && (
          <span className="text-xs text-blue-300">🔎 {data.total.toLocaleString()} found in all leads (To send + Done, Email + DM)</span>
        )}
        {(country || minFit || q || industry || sort) && (
          <button onClick={() => router.push(`/admin/ai-leads?channel=${channel}${view === "done" ? "&view=done" : ""}`)}
            className="text-xs text-gray-500 hover:text-red-400">Clear filters</button>
        )}
      </div>

      {data && !data.error && data.pages > 1 && (
        <Pager page={page} pages={data.pages} total={data.total} pageSize={data.pageSize} go={goPage} />
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading && <div className="text-center text-gray-500 py-10 text-sm">Loading...</div>}
        {!loading && data && !data.error && data.leads.length === 0 && (
          <div className="text-center text-gray-500 py-16 text-sm">No leads here yet — the agent may still be running.</div>
        )}
        {!loading && data && data.leads?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Fit</th>
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Industry</th>
                  <th className="text-left px-4 py-3">Reviews</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">{channel === "email" ? "Email" : "Find them"}</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map(l => (
                  <Fragment key={l.id}>
                    <tr onClick={() => setOpen(open === l.id ? null : l.id)}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fitColor(l.fit)}`}>{l.fit}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white max-w-[260px] truncate" title={l.name}>
                        {open === l.id ? "▾ " : "▸ "}{l.name}
                        {l.city && <span className="text-gray-500 font-normal"> · {l.city}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{l.country}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{l.industry}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {l.reviews?.toLocaleString() ?? "—"}{l.rating ? ` · ${l.rating}★` : ""}
                      </td>
                      <td className="px-4 py-3 text-lg space-x-2 whitespace-nowrap">
                        <Icon href={l.email ? mailto(l, webmail) : undefined} title={l.email ? `Email ${l.email} (short message; open the row for the sales + audit version)` : "No email found"}>✉️</Icon>
                        <Icon href={l.instagram_url ?? undefined} title={l.instagram_url ? "Open Instagram" : "No Instagram in CRM"}>📸</Icon>
                        <Icon href={l.linkedin_url ?? undefined} title={l.linkedin_url ? "Open LinkedIn" : "No LinkedIn in CRM"}>💼</Icon>
                        <Icon href={l.phone ? `tel:${l.phone.split(";")[0]}` : undefined} title={l.phone ?? "No phone"}>📞</Icon>
                        <Icon href={l.website ? l.website.split(";")[0] : undefined} title="Open website">🌐</Icon>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {channel === "email" ? (
                          <span className="space-x-3 whitespace-nowrap">
                            <span className="text-green-300">{l.email}</span>
                            <CopyNameButton name={l.name} />
                            <FollowButton name={l.name} small />
                          </span>
                        ) : (
                          <span className="space-x-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {!l.instagram_url && <a href={searchInstagram(l)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">🔍 Instagram</a>}
                            {!l.linkedin_url && <a href={searchLinkedIn(l)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">🔍 LinkedIn</a>}
                            <CopyNameButton name={l.name} />
                            <FollowButton name={l.name} small />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusButtons l={l} onDone={load} /></td>
                    </tr>
                    {open === l.id && (
                      <tr className="border-b border-gray-800 bg-gray-950/60">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                              <p className="text-gray-300">{l.summary}</p>
                              <div>
                                <div className="text-xs uppercase text-gray-500 mb-1">Their problems</div>
                                <ul className="text-gray-300 text-xs space-y-1">{l.pain_points.map((p, i) => <li key={i}>• {p}</li>)}</ul>
                              </div>
                              <div>
                                <div className="text-xs uppercase text-gray-500 mb-1">What to offer</div>
                                <ul className="text-gray-300 text-xs space-y-1">{l.needs.map((n, i) => <li key={i}>• {n}</li>)}</ul>
                              </div>
                              <div className="text-xs text-gray-600">Lead #{l.id} · confidence {l.confidence} · {l.analyzed_at?.slice(0, 16)}</div>
                            </div>
                            <EmailPanel l={l} webmail={webmail} onDone={load} />
                            <div className="space-y-2">
                              <div className="text-xs uppercase text-gray-500">💬 DM for Instagram / LinkedIn</div>
                              <pre className="whitespace-pre-wrap text-gray-300 text-xs bg-gray-900 rounded-lg p-3 font-sans">{l.dm}</pre>
                              <div className="flex gap-2 flex-wrap">
                                <CopyButton text={l.dm} label="Copy DM" />
                                <a href={l.instagram_url || searchInstagram(l)} target="_blank" rel="noopener noreferrer"
                                   className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700">📸 Instagram</a>
                                <a href={l.linkedin_url || searchLinkedIn(l)} target="_blank" rel="noopener noreferrer"
                                   className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700">💼 LinkedIn</a>
                                <CopyNameButton name={l.name} />
                                <FollowButton name={l.name} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && !data.error && (
        <Pager page={page} pages={data.pages} total={data.total} pageSize={data.pageSize} go={goPage} />
      )}
    </div>
  );
}

// useSearchParams needs a Suspense boundary in Next 14 app router pages.
export default function AiLeadsPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
      <AiLeadsInner />
    </Suspense>
  );
}
