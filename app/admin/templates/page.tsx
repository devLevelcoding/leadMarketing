"use client";
import { useEffect, useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" }, { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" }, { code: "et", label: "Estonian" },
  { code: "de", label: "German" }, { code: "fr", label: "French" },
  { code: "is", label: "Icelandic" },
];
const DOMAINS = [
  { value: "",          label: "All domains" },
  { value: "crm",       label: "Retail / CRM" },
  { value: "no_website",label: "No Website" },
  { value: "health",    label: "Health & Wellness" },
  { value: "b2b",       label: "B2B Services" },
  { value: "tourism",   label: "Tourism & Travel" },
];
const VARIABLES = ["{{company_name}}","{{city}}","{{country}}","{{website}}","{{phone}}"];

type Template = {
  id: number; name: string; language: string; domain: string | null;
  subject: string; body: string; createdAt: string;
};

const EMPTY: Omit<Template, "id"|"createdAt"> = {
  name: "", language: "en", domain: null, subject: "", body: "",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [isNew, setIsNew] = useState(false);

  async function load() {
    const data = await fetch("/api/templates").then(r => r.json());
    setTemplates(data);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (isNew) {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
    } else {
      await fetch(`/api/templates/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
    }
    setEditing(null);
    await load();
  }

  async function del(id: number) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    await load();
  }

  function insertVar(variable: string) {
    if (!editing) return;
    setEditing(e => ({ ...e, body: (e?.body || "") + variable }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-gray-500 text-sm">Manage personalised outreach templates</p>
        </div>
        <button
          onClick={() => { setEditing(EMPTY); setIsNew(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >+ New Template</button>
      </div>

      {/* Variables reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-700 mb-2">Available variables (auto-filled from lead data):</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map(v => (
            <code key={v} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded font-mono">{v}</code>
          ))}
        </div>
      </div>

      {/* Template list */}
      <div className="grid gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.language.toUpperCase()}</span>
                  {t.domain && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{t.domain}</span>}
                </div>
                <p className="text-sm text-gray-500 mt-1">{t.subject}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(t); setIsNew(false); }}
                  className="text-sm text-blue-600 hover:underline">Edit</button>
                <button onClick={() => del(t.id)}
                  className="text-sm text-red-500 hover:underline">Delete</button>
              </div>
            </div>
            <details className="mt-3">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Preview body</summary>
              <pre className="mt-2 text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap text-gray-700">{t.body}</pre>
            </details>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-12 text-gray-400">No templates yet. Create your first one.</div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">{isNew ? "New Template" : "Edit Template"}</h2>
                <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">TEMPLATE NAME</label>
                  <input
                    value={editing.name || ""}
                    onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. CRM Pitch - Norwegian"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">LANGUAGE</label>
                  <select
                    value={editing.language || "en"}
                    onChange={e => setEditing(v => ({ ...v, language: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">TARGET DOMAIN (optional)</label>
                <select
                  value={editing.domain || ""}
                  onChange={e => setEditing(v => ({ ...v, domain: e.target.value || null }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">SUBJECT</label>
                <input
                  value={editing.subject || ""}
                  onChange={e => setEditing(v => ({ ...v, subject: e.target.value }))}
                  placeholder="e.g. IT Services Partnership — {{company_name}}"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-gray-500">BODY</label>
                  <div className="flex gap-1">
                    {VARIABLES.map(v => (
                      <button key={v} onClick={() => insertVar(v)}
                        className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-100 font-mono">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={editing.body || ""}
                  onChange={e => setEditing(v => ({ ...v, body: e.target.value }))}
                  rows={12}
                  placeholder="Hello,&#10;&#10;My name is Marian Pirvan and I represent LevelCoding..."
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!editing.name || !editing.subject || !editing.body}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >Save Template</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
