const JSON_HEADERS = { "Content-Type": "application/json" };

async function streamSse(
  res: Response,
  onEvent: (msg: { type: string; done?: number; total?: number }) => void
) {
  if (!res.body) throw new Error("No response body");
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const raw = line.replace(/^data: /, "").trim();
      if (!raw) continue;
      try { onEvent(JSON.parse(raw)); } catch { /* skip */ }
    }
  }
}

export async function getTemplates() {
  return fetch("/api/templates").then(r => r.json());
}

export async function getWarmupPlan(phase: number) {
  return fetch(`/api/warmup?phase=${phase}`).then(r => r.json());
}

export async function getWarmupToday(phase: number) {
  return fetch(`/api/warmup/today?phase=${phase}`).then(r => r.json());
}

export async function getWarmupHistory(phase: number) {
  return fetch(`/api/warmup/history?phase=${phase}`).then(r => r.json());
}

export async function getWarmupUpcoming(days: number, phase: number) {
  return fetch(`/api/warmup/upcoming?days=${days}&phase=${phase}`).then(r => r.json());
}

export async function getWarmupBatch(batchId: number) {
  return fetch(`/api/warmup/batches/${batchId}`).then(r => r.json());
}

export async function getLighthouseScores(leadIds: number[]) {
  return fetch(`/api/lighthouse/scans?leadIds=${leadIds.join(",")}`).then(r => r.json());
}

export async function getLeadLighthouse(leadId: number) {
  return fetch(`/api/lighthouse/lead/${leadId}`).then(r => r.json());
}

export async function getLeadReport(leadId: number) {
  return fetch(`/api/report/${leadId}`).then(r => r.json());
}

export async function createWarmupPlan(phase: number, startDate: string) {
  return fetch("/api/warmup", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ startDate, phase }),
  });
}

export async function deleteWarmupPlan(phase: number) {
  return fetch(`/api/warmup?phase=${phase}`, { method: "DELETE" });
}

export async function patchWarmupBatchLead(id: number, status: string) {
  return fetch(`/api/warmup/batch-leads/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ status }),
  });
}

export async function advanceWarmupDay(phase: number) {
  return fetch(`/api/warmup/advance?phase=${phase}`, { method: "POST" });
}

export async function streamLighthouseScan(
  leadIds: number[],
  onEvent: (msg: { type: string; done?: number; total?: number }) => void
) {
  const res = await fetch("/api/lighthouse/scan", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ leadIds }),
  });
  return streamSse(res, onEvent);
}

export async function getEducationGrid() {
  return fetch("/api/warmup/education-grid").then(r => r.json());
}

export async function streamReportScan(
  leadIds: number[],
  onEvent: (msg: { type: string; done?: number; total?: number }) => void
) {
  const res = await fetch("/api/report/scan", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ leadIds }),
  });
  return streamSse(res, onEvent);
}
