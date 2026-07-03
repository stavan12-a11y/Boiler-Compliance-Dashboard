import type { Boiler, BoilerStatus, Inspection } from "../types";
import {
  addYears,
  daysBetween,
  formatDate,
  parseDate,
  todayDate,
  WARNING_WINDOW_DAYS,
} from "./helpers";

/** Most recent inspection found in a boiler's history, by inspection date. */
export function getMostRecentHistory(boiler: Boiler): Inspection | null {
  if (boiler.history.length === 0) return null;
  return [...boiler.history].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  )[0];
}

export function getBoilerStatus(boiler: Boiler): BoilerStatus {
  const active = boiler.activeInspection;
  if (active) {
    if (active.result === "fail") return "failed";
    // Legacy: a completed inspection left on the active slot still reads green.
    if (active.status === "completed") return "passed";
    return "active";
  }
  // No active inspection: derive from the most recent archived round.
  const last = getMostRecentHistory(boiler);
  if (!last) return "none";
  return last.result === "pass" ? "passed" : "none";
}

/** The date of the most recent inspection (active or archived), if any. */
export function getLastInspectedDate(boiler: Boiler): string | null {
  const dates: string[] = [];
  if (boiler.activeInspection) dates.push(boiler.activeInspection.date);
  for (const h of boiler.history) dates.push(h.date);
  if (dates.length === 0) return null;
  return dates.sort((a, b) => parseDate(b).getTime() - parseDate(a).getTime())[0];
}

export interface ScheduleInfo {
  /** Reference date used to compute the next-due date. */
  basisDate: string;
  nextDueDate: Date;
  /** Safe display string for the next-due date. */
  nextDueLabel: string;
  /** Positive => overdue by N days. */
  daysOverdue: number;
  /** Days remaining until due (negative when overdue). */
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export function getScheduleInfo(boiler: Boiler, now = new Date()): ScheduleInfo {
  const basis = getLastInspectedDate(boiler) ?? todayDate();
  let basisDate = parseDate(basis);
  if (Number.isNaN(basisDate.getTime())) {
    basisDate = parseDate(todayDate());
  }
  const nextDueDate = addYears(basisDate, boiler.inspectionIntervalYears);
  const safeDue =
    Number.isNaN(nextDueDate.getTime()) ? parseDate(todayDate()) : nextDueDate;
  const daysUntilDue = daysBetween(now, safeDue);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = !isOverdue && daysUntilDue <= WARNING_WINDOW_DAYS;
  const dueIso = Number.isNaN(safeDue.getTime())
    ? todayDate()
    : safeDue.toISOString().slice(0, 10);
  return {
    basisDate: basis,
    nextDueDate: safeDue,
    nextDueLabel: formatDate(dueIso),
    daysOverdue: isOverdue ? -daysUntilDue : 0,
    daysUntilDue,
    isOverdue,
    isDueSoon,
  };
}

export function inspectionDurationMs(inspection: Inspection): number | null {
  if (!inspection.completedAt) return null;
  const ms =
    new Date(inspection.completedAt).getTime() -
    new Date(inspection.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export interface FleetStats {
  total: number;
  active: number;
  failed: number;
  overdue: number;
  dueSoon: number;
  /** Durations (ms) of all completed inspections across the fleet. */
  completedDurations: number[];
}

export function getFleetStats(boilers: Boiler[]): FleetStats {
  let active = 0;
  let failed = 0;
  let overdue = 0;
  let dueSoon = 0;
  const completedDurations: number[] = [];

  for (const boiler of boilers) {
    const status = getBoilerStatus(boiler);
    if (status === "active") active += 1;
    if (status === "failed") failed += 1;

    const schedule = getScheduleInfo(boiler);
    if (schedule.isOverdue) overdue += 1;
    else if (schedule.isDueSoon) dueSoon += 1;

    const completed: Inspection[] = [...boiler.history];
    if (boiler.activeInspection?.status === "completed") {
      completed.push(boiler.activeInspection);
    }
    for (const insp of completed) {
      const dur = inspectionDurationMs(insp);
      if (dur !== null) completedDurations.push(dur);
    }
  }

  return {
    total: boilers.length,
    active,
    failed,
    overdue,
    dueSoon,
    completedDurations,
  };
}

export const STATUS_META: Record<
  BoilerStatus,
  {
    label: string;
    dot: string;
    ring: string;
    text: string;
    badgeBg: string;
    cardBanner: string;
    cardRing: string;
    cardBadge: string;
  }
> = {
  failed: {
    label: "Needs repairs",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    text: "text-rose-700",
    badgeBg: "bg-rose-50",
    cardBanner: "bg-rose-500 text-white",
    cardRing: "ring-2 ring-rose-400/45",
    cardBadge: "bg-white/20 text-white",
  },
  active: {
    label: "Inspection underway",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
    badgeBg: "bg-amber-50",
    cardBanner: "bg-amber-500 text-white",
    cardRing: "ring-2 ring-amber-400/45",
    cardBadge: "bg-white/20 text-white",
  },
  passed: {
    label: "Passed & complete",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    cardBanner: "bg-emerald-500 text-white",
    cardRing: "ring-2 ring-emerald-400/45",
    cardBadge: "bg-white/20 text-white",
  },
  none: {
    label: "No inspection yet",
    dot: "bg-slate-400",
    ring: "ring-slate-200",
    text: "text-slate-600",
    badgeBg: "bg-slate-50",
    cardBanner: "bg-slate-500 text-white",
    cardRing: "",
    cardBadge: "bg-white/20 text-white",
  },
};

export const OVERDUE_CARD = {
  label: "Overdue inspection",
  cardBanner: "bg-orange-500 text-white",
  cardRing: "ring-2 ring-orange-400/45",
  cardBadge: "bg-white/20 text-white",
  footer: "border-orange-100 bg-orange-50",
  footerText: "text-orange-800",
  footerIcon: "text-orange-500",
};
