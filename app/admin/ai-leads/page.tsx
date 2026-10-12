"use client";

import { Fragment, useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
  error?: string;
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
function mailto(l: AiLead, webmail: string | null) {
  const to = encodeURIComponent(l.email ?? ""), subject = encodeURIComponent(l.subject),
        body = encodeURIComponent(l.message);
  return webmail
    ? `${webmail}?_task=mail&_action=compose&_to=${to}&_subject=${subject}&_body=${body}`
    : `mailto:${l.email}?subject=${subject}&body=${body}`;
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
      const p = new URLSearchParams({
        email: channel === "email" ? "yes" : "no", view, country, minFit, q, page: String(page),
      });
      const res = await fetch(`/api/ai-leads?${p}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [channel, view, country, minFit, q, page]);

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
        <input type="text" placeholder="Search name, city, website, industry…" value={q}
          onChange={e => setParam("q", e.target.value)} className={`${INPUT} w-72`} />
        <select value={country} onChange={e => setParam("country", e.target.value)} className={INPUT}>
          <option value="">All countries</option>
          {data?.countries?.map(c => <option key={c.country} value={c.country}>{c.country} ({c.n})</option>)}
        </select>
        <select value={minFit} onChange={e => setParam("minFit", e.target.value)} className={INPUT}>
          <option value="">Any fit</option>
          <option value="70">🔥 Fit 70+</option>
          <option value="50">Fit 50+</option>
        </select>
        {(country || minFit || q) && (
          <button onClick={() => router.push(`/admin/ai-leads?channel=${channel}${view === "done" ? "&view=done" : ""}`)}
            className="text-xs text-gray-500 hover:text-red-400">Clear filters</button>
        )}
      </div>

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
                        <Icon href={l.email ? mailto(l, webmail) : undefined} title={l.email ? `Email ${l.email} (opens with message)` : "No email found"}>✉️</Icon>
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
                            <div className="space-y-2">
                              <div className="text-xs uppercase text-gray-500">📧 Email</div>
                              <div className="text-white text-sm font-medium">{l.subject}</div>
                              <pre className="whitespace-pre-wrap text-gray-300 text-xs bg-gray-900 rounded-lg p-3 font-sans">{l.message}</pre>
                              <div className="flex gap-2 flex-wrap">
                                {l.email && <a href={mailto(l, webmail)} target={webmail ? "_blank" : undefined} rel="noopener noreferrer"
                                   className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">
                                  ✉️ {webmail ? "Open in webmail" : "Open in email app"}</a>}
                                {l.email && <CopyButton text={l.email} label="Copy address" />}
                                <CopyButton text={l.subject} label="Copy subject" />
                                <CopyButton text={l.message} label="Copy email" />
                                <StatusButtons l={l} onDone={load} />
                              </div>
                            </div>
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

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button onClick={() => setParam("page", String(page - 1))}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-gray-300">Previous</button>
            )}
            {page < data.pages && (
              <button onClick={() => setParam("page", String(page + 1))}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-gray-300">Next</button>
            )}
          </div>
        </div>
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
