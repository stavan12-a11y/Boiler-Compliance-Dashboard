import type { Boiler, BoilerStatus, Inspection } from "../types";
import {
  addYears,
  daysBetween,
  parseDate,
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
  /** Positive => overdue by N days. */
  daysOverdue: number;
  /** Days remaining until due (negative when overdue). */
  daysUntilDue: number;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export function getScheduleInfo(boiler: Boiler, now = new Date()): ScheduleInfo {
  const basis = getLastInspectedDate(boiler) ?? boiler.installDate;
  const nextDueDate = addYears(
    parseDate(basis),
    boiler.inspectionIntervalYears
  );
  const daysUntilDue = daysBetween(now, nextDueDate);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = !isOverdue && daysUntilDue <= WARNING_WINDOW_DAYS;
  return {
    basisDate: basis,
    nextDueDate,
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
  /** Durations (ms) of all completed inspections across the fleet. */
  completedDurations: number[];
}

export function getFleetStats(boilers: Boiler[]): FleetStats {
  let active = 0;
  let failed = 0;
  const completedDurations: number[] = [];

  for (const boiler of boilers) {
    const status = getBoilerStatus(boiler);
    if (status === "active") active += 1;
    if (status === "failed") failed += 1;

    const completed: Inspection[] = [...boiler.history];
    if (boiler.activeInspection?.status === "completed") {
      completed.push(boiler.activeInspection);
    }
    for (const insp of completed) {
      const dur = inspectionDurationMs(insp);
      if (dur !== null) completedDurations.push(dur);
    }
  }

  return { total: boilers.length, active, failed, completedDurations };
}

export const STATUS_META: Record<
  BoilerStatus,
  { label: string; dot: string; ring: string; text: string; badgeBg: string }
> = {
  failed: {
    label: "Needs repairs",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    text: "text-rose-700",
    badgeBg: "bg-rose-50",
  },
  active: {
    label: "Inspection underway",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
    badgeBg: "bg-amber-50",
  },
  passed: {
    label: "Passed & complete",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-50",
  },
  none: {
    label: "No inspection yet",
    dot: "bg-slate-400",
    ring: "ring-slate-200",
    text: "text-slate-600",
    badgeBg: "bg-slate-100",
  },
};
