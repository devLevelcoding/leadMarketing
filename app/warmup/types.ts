export type BatchSummary = {
  id: number; dayNumber: number; date: string; quota: number;
  sent: number; skipped: number; total: number; isToday: boolean; isPast: boolean;
};

export type PlanStatus = {
  id: number; phase: number; startDate: string; totalDays: number;
  currentDay: number | null; batches: BatchSummary[];
};

export type EmailLog = { id: number; sentAt: string; subject: string; status: string };

export type Lead = {
  id: number; name: string; domain: string; category: string | null;
  phone: string | null; website: string | null; city: string | null;
  country: string | null; rating?: string | null; status: string;
  emailLogs: EmailLog[];
};

export type BatchLead = { id: number; leadId: number; status: string; sentAt: string | null; lead: Lead };

export type TodayBatch    = { id: number; dayNumber: number; date: string; quota: number; leads: BatchLead[] };
export type HistoryBatch  = TodayBatch;
export type UpcomingBatch = TodayBatch;

export type Template = { id: number; name: string; language: string; domain: string | null; subject: string; body: string };

export type LhScore = { sec: number; seo: number; sem: number };

export type FullScan = {
  url: string; secScore: number; seoScore: number; semScore: number;
  https: boolean; hsts: boolean; xfo: boolean; csp: boolean; xcto: boolean; xssHeader: boolean;
  hasTitle: boolean; hasMeta: boolean; hasH1: boolean; hasCanonical: boolean;
  hasOg: boolean; hasRobots: boolean; hasSitemap: boolean;
  hasGa: boolean; hasGtm: boolean; hasGtm2?: boolean; hasFbPixel: boolean;
  hasLinkedIn: boolean; hasSchemaOrg: boolean; hasHotjar: boolean;
  error: string | null;
};

export type LeadReport = {
  scannedAt: string; loadTimeMs: number | null;
  sslValid: boolean | null; sslExpiryDays: number | null; sslIssuer: string | null;
  hasViewport: boolean | null; hasTouchIcon: boolean | null;
  totalLinks: number | null; brokenLinks: number | null; brokenUrls: string | null;
  hasFacebook: boolean | null; hasInstagram: boolean | null; hasLinkedIn: boolean | null;
  hasTiktok: boolean | null; hasYoutube: boolean | null; hasTwitter: boolean | null;
  hasSPF: boolean | null; hasDKIM: boolean | null; hasDMARC: boolean | null;
  spfValue: string | null; dmarcPolicy: string | null;
};
