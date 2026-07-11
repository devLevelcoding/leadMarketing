const JSON_HEADERS = { "Content-Type": "application/json" };

async function safeJson(r: Response) {
  try { return await r.json(); } catch { return {}; }
}

export async function getWaCampaign(phase: number) {
  return fetch(`/api/whatsapp/campaign?phase=${phase}`).then(safeJson);
}

export async function getWaToday(phase: number) {
  return fetch(`/api/whatsapp/today?phase=${phase}`).then(safeJson);
}

export async function getWaHistory(phase: number) {
  return fetch(`/api/whatsapp/history?phase=${phase}`).then(safeJson);
}

export async function createWaCampaign(phase: number, startDate: string) {
  return fetch("/api/whatsapp/campaign", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ startDate, phase }),
  });
}

export async function deleteWaCampaign(phase: number) {
  return fetch(`/api/whatsapp/campaign?phase=${phase}`, { method: "DELETE" });
}

export async function patchWaBatchLead(id: number, status: string) {
  return fetch(`/api/whatsapp/batch-leads/${id}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ status }),
  });
}

export async function advanceWaDay(phase: number) {
  return fetch(`/api/whatsapp/advance?phase=${phase}`, { method: "POST" });
}
