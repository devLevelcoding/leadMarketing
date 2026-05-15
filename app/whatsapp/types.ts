export type WaBatchSummary = {
  id: number; dayNumber: number; date: string; quota: number;
  sent: number; noAnswer: number; replied: number; skipped: number; total: number;
  isToday: boolean; isPast: boolean;
};

export type WaPlanStatus = {
  id: number; phase: number; startDate: string; totalDays: number;
  currentDay: number | null; batches: WaBatchSummary[];
};

export type Lead = {
  id: number; name: string; domain: string; category: string | null;
  phone: string | null; website: string | null; city: string | null;
  country: string | null; rating?: string | null;
};

export type WaBatchLead = { id: number; leadId: number; status: string; sentAt: string | null; lead: Lead };

export type WaTodayBatch   = { id: number; dayNumber: number; date: string; quota: number; leads: WaBatchLead[] };
export type WaHistoryBatch = WaTodayBatch;
