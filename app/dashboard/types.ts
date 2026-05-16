export type Stats = {
  total: number;
  byDomain:  { domain: string;  _count: { id: number } }[];
  byStatus:  { status: string;  _count: { id: number } }[];
  byCountry: { country: string; _count: { id: number }; contacted: number; skipped: number }[];
  byPhase:   { phase: number;   _count: { id: number } }[];
};

export type DayEntry = {
  date: string; dayName: string; dateLabel: string;
  quota: number; isToday: boolean; isPast: boolean;
};

export type WeekEntry  = { weekLabel: string;  quota: number; days: number };
export type MonthEntry = { monthLabel: string; quota: number; days: number };

export type Campaign = {
  phase: number | null; totalLeads: number; sentCount: number;
  remaining: number; todayQuota: number; completionDate: string;
  thisWeek: DayEntry[]; thisMonth: WeekEntry[]; threeMonths: MonthEntry[];
};

export type CountryStat = {
  country: string; _count: { id: number }; contacted: number; skipped: number;
};
