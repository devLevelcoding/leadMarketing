"use client";

// Sales Copilot: chat with the AI lead agent (F:\AiAgent\lead-intelligence-agent) over its
// WebSocket. Protocol: that repo's docs/ws-events.md — ready, tool_start / tool_end, token,
// confirm_request, final, error; we send message / confirm.
import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_AGENT_WS_URL || "ws://127.0.0.1:8000/ws/chat";
// Local API runs without a key. A deployed one needs it: never ship a production key in
// NEXT_PUBLIC_ variables (they end up in the browser); proxy through the server instead.
const TOKEN = process.env.NEXT_PUBLIC_AGENT_TOKEN || "";
const STORE = "copilot.v1";

type Step = { id: string; name: string; args: Record<string, unknown>; ok?: boolean; summary?: string };
type Msg =
  | { role: "user"; text: string }
  | { role: "agent"; text: string; steps: Step[]; done: boolean; tokens?: string; error?: string };
type Confirm = { call_id: string; action: string; message: string };
type Saved = { conversationId: string | null; messages: Msg[] };

const EXAMPLES = [
  "Find 5 dental clinics in the UAE with an email but no HTTPS",
  "Which industries have the most leads with an email?",
  "How many emails a day can I send while warming up?",
  "How do we pitch gyms?",
];

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { conversationId: null, messages: [] };
}

function save(s: Saved) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {}
}

/** **bold** and line breaks; everything else stays text (no HTML from the model). */
function Rich({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="text-white">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>)}
    </div>
  );
}

function StepChip({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const state = step.ok === undefined ? "running" : step.ok ? "ok" : "failed";
  const color = state === "running" ? "border-blue-700 text-blue-300"
    : state === "ok" ? "border-gray-700 text-gray-300" : "border-red-700 text-red-300";
  return (
    <div className={`text-xs border rounded-lg ${color} bg-gray-900/60`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3 py-1.5 flex items-center gap-2">
        <span>{state === "running" ? "⏳" : state === "ok" ? "✓" : "✗"}</span>
        <span className="font-mono">{step.name}</span>
        <span className="text-gray-500 truncate">{JSON.stringify(step.args)}</span>
        <span className="ml-auto text-gray-600">{open ? "▾" : "▸"}</span>
      </button>
      {open && step.summary && (
        <pre className="px-3 pb-2 whitespace-pre-wrap font-sans text-gray-400">{step.summary}</pre>
      )}
    </div>
  );
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [input, setInput] = useState("");
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef(0);
  const convRef = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  // The last agent message is the one being streamed into.
  const patchAgent = useCallback((fn: (m: Extract<Msg, { role: "agent" }>) => Extract<Msg, { role: "agent" }>) => {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        const m = next[i];
        if (m.role === "agent") { next[i] = fn(m); break; }
      }
      return next;
    });
  }, []);

  const connect = useCallback(() => {
    setStatus("connecting");
    const params = new URLSearchParams();
    if (TOKEN) params.set("token", TOKEN);
    if (convRef.current) params.set("conversation_id", convRef.current);
    const sock = new WebSocket(`${WS_URL}${params.toString() ? "?" + params : ""}`);
    ws.current = sock;

    sock.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      switch (ev.type) {
        case "ready":
          retry.current = 0;
          convRef.current = ev.conversation_id;
          setConversationId(ev.conversation_id);
          setStatus("online");
          break;
        case "tool_start":
          patchAgent(m => ({ ...m, steps: [...m.steps, { id: ev.call_id, name: ev.name, args: ev.args }] }));
          break;
        case "tool_end":
          patchAgent(m => ({ ...m, steps: m.steps.map(s => s.id === ev.call_id ? { ...s, ok: ev.ok, summary: ev.summary } : s) }));
          break;
        case "token":
          patchAgent(m => ({ ...m, text: m.text + ev.text }));
          break;
        case "retract":
          // A guardrail rejected what streamed so far (e.g. it cited the playbook without
          // looking it up): drop it and show why; the corrected answer streams next.
          patchAgent(m => ({ ...m, text: "", steps: [...m.steps,
            { id: `retract-${m.steps.length}`, name: "guardrail", args: {}, ok: false, summary: ev.reason }] }));
          break;
        case "confirm_request":
          setConfirm({ call_id: ev.call_id, action: ev.action, message: ev.message });
          setBusy(false);
          break;
        case "final":
          patchAgent(m => ({ ...m, text: ev.text, done: true, tokens: `${ev.input_tokens} in · ${ev.output_tokens} out` }));
          setBusy(false);
          break;
        case "error":
          if (ev.code === "busy") break;                     // the running turn carries on
          patchAgent(m => ({ ...m, done: true, error: `${ev.code}: ${ev.message}` }));
          setBusy(false);
          break;
      }
    };
    sock.onclose = () => {
      setStatus("offline");
      setBusy(false);
      // Reconnect with backoff (1, 2, 4 … 30 s); the conversation continues on the server.
      const wait = Math.min(30, 2 ** retry.current++) * 1000;
      setTimeout(() => { if (ws.current === sock) connect(); }, wait);
    };
  }, [patchAgent]);

  useEffect(() => {
    const saved = load();
    convRef.current = saved.conversationId;
    setConversationId(saved.conversationId);
    setMessages(saved.messages.map(m => m.role === "agent" ? { ...m, done: true } : m));
    connect();
    return () => { const s = ws.current; ws.current = null; s?.close(); };
  }, [connect]);

  useEffect(() => { save({ conversationId, messages }); }, [conversationId, messages]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, confirm]);

  function send(text: string) {
    const q = text.trim();
    if (!q || busy || confirm || ws.current?.readyState !== WebSocket.OPEN) return;
    setMessages(prev => [...prev, { role: "user", text: q }, { role: "agent", text: "", steps: [], done: false }]);
    ws.current.send(JSON.stringify({ type: "message", text: q }));
    setInput("");
    setBusy(true);
  }

  function answer(approve: boolean) {
    if (!confirm || ws.current?.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: "confirm", call_id: confirm.call_id, approve }));
    setConfirm(null);
    setBusy(true);
  }

  function newChat() {
    convRef.current = null;
    setConversationId(null);
    setMessages([]);
    setConfirm(null);
    const s = ws.current; ws.current = null; s?.close();
    connect();
  }

  const dot = status === "online" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Copilot</h1>
          <p className="text-sm text-gray-500">
            Ask about your leads, the playbook or the pipeline. It looks things up with tools and asks before changing anything.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${dot}`} />{status}</span>
          <button onClick={newChat} className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300">
            New chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2 mt-8">
            {EXAMPLES.map(q => (
              <button key={q} onClick={() => send(q)} disabled={status !== "online"}
                className="text-left text-sm px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-blue-700 text-gray-300 disabled:opacity-40">
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-sm">{m.text}</div>
          </div>
        ) : (
          <div key={i} className="space-y-2">
            {m.steps.map(s => <StepChip key={s.id} step={s} />)}
            {(m.text || !m.done) && (
              <div className="max-w-[90%] px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm text-gray-200">
                {m.text ? <Rich text={m.text} /> : <span className="text-gray-500 animate-pulse">Thinking…</span>}
              </div>
            )}
            {m.error && <div className="text-xs text-red-300 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{m.error}</div>}
            {m.tokens && <div className="text-[11px] text-gray-600 pl-1">{m.tokens} tokens</div>}
          </div>
        ))}
        {confirm && (
          <div className="border border-yellow-700 bg-yellow-950/30 rounded-xl p-4 text-sm">
            <div className="text-yellow-200 font-medium mb-3">{confirm.message}</div>
            <div className="flex gap-2">
              <button onClick={() => answer(true)} className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white">Approve</button>
              <button onClick={() => answer(false)} className="px-4 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300">Decline</button>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="mt-4 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} maxLength={4000}
          placeholder={confirm ? "Answer the question above first" : status === "online" ? "Ask the copilot…" : "Connecting to the agent…"}
          disabled={status !== "online" || busy || !!confirm}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 disabled:opacity-50" />
        <button type="submit" disabled={status !== "online" || busy || !!confirm || !input.trim()}
          className="px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-40">
          {busy ? "…" : "Send"}
        </button>
      </form>
      {status === "offline" && (
        <p className="text-xs text-gray-500 mt-2">
          Agent offline — start it: <code className="text-gray-400">uv run uvicorn app.main:app</code> in F:\AiAgent\lead-intelligence-agent. Reconnecting…
        </p>
      )}
    </div>
  );
}
