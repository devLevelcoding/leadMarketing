import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily quota ramp: working days since campaign start
function dailyQuota(workingDay: number): number {
  if (workingDay <= 5)  return 10;  // Week 1
  if (workingDay <= 25) return 25;  // Weeks 2-5
  if (workingDay <= 45) return 40;  // Month 2
  return 60;                        // Month 3+
}

function isWorkday(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// Build a schedule from startDate for enough days to send all leads
function buildSchedule(startDate: Date, totalLeads: number, sentSoFar: number) {
  const days: { date: Date; quota: number; cumulative: number }[] = [];
  let workingDay = 0;
  let cumulative = 0;
  let d = new Date(startDate);

  // Generate enough days to cover all remaining leads + 3 months buffer
  const maxDays = 180;
  for (let i = 0; i < maxDays && cumulative < totalLeads; i++) {
    if (isWorkday(d)) {
      workingDay++;
      const q = dailyQuota(workingDay);
      cumulative += q;
      days.push({ date: new Date(d), quota: q, cumulative: Math.min(cumulative, totalLeads) });
    }
    d = addDays(d, 1);
  }
  return days;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phaseParam = searchParams.get("phase");
  const phase = phaseParam ? parseInt(phaseParam) : null;
  const where = phase ? { phase } : {};

  const [totalLeads, sentCount] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.emailLog.count({ where: { lead: where } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Campaign start = today (Phase 2 & 3 just imported; Phase 1 treat as starting today too)
  const startDate = new Date(today);
  const schedule = buildSchedule(startDate, totalLeads, sentCount);

  // ── This Week ─────────────────────────────────────────────────────
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekEnd = addDays(weekStart, 4); // Friday

  const thisWeek = [];
  for (let i = 0; i < 5; i++) {
    const d = addDays(weekStart, i);
    const entry = schedule.find(s => toDateStr(s.date) === toDateStr(d));
    thisWeek.push({
      date: toDateStr(d),
      dayName: d.toLocaleDateString("en-GB", { weekday: "short" }),
      dateLabel: formatDate(d),
      quota: entry?.quota ?? 0,
      isToday: toDateStr(d) === toDateStr(today),
      isPast: d < today,
    });
  }

  // ── This Month — by week ───────────────────────────────────────────
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const thisMonth: { weekLabel: string; quota: number; days: number }[] = [];
  let wStart = new Date(monthStart);
  // Align to Monday
  const dow = wStart.getDay();
  if (dow !== 1) wStart.setDate(wStart.getDate() - (dow === 0 ? 6 : dow - 1));

  while (wStart <= monthEnd) {
    const wEnd = addDays(wStart, 4);
    let weekQuota = 0;
    let workDays = 0;
    for (let i = 0; i < 5; i++) {
      const d = addDays(wStart, i);
      if (d >= monthStart && d <= monthEnd) {
        const entry = schedule.find(s => toDateStr(s.date) === toDateStr(d));
        weekQuota += entry?.quota ?? 0;
        workDays++;
      }
    }
    if (workDays > 0) {
      thisMonth.push({
        weekLabel: `${formatDate(wStart)} – ${formatDate(wEnd)}`,
        quota: weekQuota,
        days: workDays,
      });
    }
    wStart = addDays(wStart, 7);
  }

  // ── 3-Month Overview ──────────────────────────────────────────────
  const threeMonths = [];
  for (let m = 0; m < 3; m++) {
    const mStart = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const mEnd   = new Date(today.getFullYear(), today.getMonth() + m + 1, 0);
    let mQuota = 0;
    let mDays = 0;
    for (let d = new Date(mStart); d <= mEnd; d = addDays(d, 1)) {
      const entry = schedule.find(s => toDateStr(s.date) === toDateStr(d));
      if (entry) { mQuota += entry.quota; mDays++; }
    }
    threeMonths.push({
      monthLabel: mStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      quota: mQuota,
      days: mDays,
    });
  }

  // ── Today's target ────────────────────────────────────────────────
  const todayEntry = schedule.find(s => toDateStr(s.date) === toDateStr(today));
  const todayQuota = todayEntry?.quota ?? 0;

  // Estimated completion
  const lastDay = schedule[schedule.length - 1];
  const completionDate = lastDay
    ? lastDay.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return NextResponse.json({
    phase,
    totalLeads,
    sentCount,
    remaining: totalLeads - sentCount,
    todayQuota,
    completionDate,
    thisWeek,
    thisMonth,
    threeMonths,
  });
}
