import type { Boiler, KpiFilterKey, KpiSnapshot, KpiTrendMetric } from "../types";
import {
  getBoilerStatus,
  getFleetStats,
  getScheduleInfo,
  inspectionDurationMs,
} from "./derive";
import { uid } from "./helpers";

export const KPI_FILTER_LABELS: Record<KpiFilterKey, string> = {
  all: "All boilers",
  compliant: "Compliant (passed & not overdue)",
  overdue: "Overdue inspections",
  dueSoon: "Due within 30 days",
  failed: "Failed / needs repair",
  withDowntime: "With completed inspections",
};

export const KPI_TREND_LABELS: Record<KpiTrendMetric, string> = {
  total: "Total boilers",
  compliant: "Compliant count",
  complianceRate: "Compliance rate (%)",
  overdue: "Overdue count",
  dueSoon: "Due soon count",
  failed: "Failed count",
  avgDowntime: "Average downtime (days)",
};

export function isBoilerCompliant(boiler: Boiler): boolean {
  return (
    getBoilerStatus(boiler) === "passed" && !getScheduleInfo(boiler).isOverdue
  );
}

export function boilerHasCompletedInspection(boiler: Boiler): boolean {
  const completed = [...boiler.history];
  if (boiler.activeInspection?.status === "completed") {
    completed.push(boiler.activeInspection);
  }
  return completed.some((insp) => inspectionDurationMs(insp) !== null);
}

export function countCompliant(boilers: Boiler[]): number {
  return boilers.filter(isBoilerCompliant).length;
}

export function complianceRate(boilers: Boiler[]): number {
  if (boilers.length === 0) return 0;
  return Math.round((countCompliant(boilers) / boilers.length) * 1000) / 10;
}

export function filterBoilersByKpi(
  boilers: Boiler[],
  kpi: KpiFilterKey
): Boiler[] {
  switch (kpi) {
    case "compliant":
      return boilers.filter(isBoilerCompliant);
    case "overdue":
      return boilers.filter((b) => getScheduleInfo(b).isOverdue);
    case "dueSoon":
      return boilers.filter((b) => {
        const s = getScheduleInfo(b);
        return s.isDueSoon && !s.isOverdue;
      });
    case "failed":
      return boilers.filter((b) => getBoilerStatus(b) === "failed");
    case "withDowntime":
      return boilers.filter(boilerHasCompletedInspection);
    default:
      return boilers;
  }
}

export function buildKpiSnapshot(boilers: Boiler[], at: string): KpiSnapshot {
  const stats = getFleetStats(boilers);
  const compliant = countCompliant(boilers);
  const avgMs =
    stats.completedDurations.length > 0
      ? stats.completedDurations.reduce((sum, d) => sum + d, 0) /
        stats.completedDurations.length
      : null;

  return {
    id: uid("kpi"),
    at,
    total: stats.total,
    compliant,
    complianceRate: complianceRate(boilers),
    overdue: stats.overdue,
    dueSoon: stats.dueSoon,
    failed: stats.failed,
    avgDowntimeDays:
      avgMs !== null
        ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10
        : null,
  };
}

function dayKey(at: string): string {
  return at.slice(0, 10);
}

/** Keep the latest snapshot for each calendar day, newest first. */
export function dedupeKpiHistoryByDay(history: KpiSnapshot[]): KpiSnapshot[] {
  const byDay = new Map<string, KpiSnapshot>();
  for (const snap of history) {
    const day = dayKey(snap.at);
    const existing = byDay.get(day);
    if (!existing || new Date(snap.at).getTime() > new Date(existing.at).getTime()) {
      byDay.set(day, snap);
    }
  }
  return Array.from(byDay.values()).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

/** Record or refresh today's compliance snapshot — at most one entry per day. */
export function recordDailyKpiSnapshot(
  history: KpiSnapshot[],
  boilers: Boiler[],
  at: string
): KpiSnapshot[] {
  const today = dayKey(at);
  const next = buildKpiSnapshot(boilers, at);
  const withoutToday = history.filter((s) => dayKey(s.at) !== today);
  return [next, ...withoutToday].slice(0, 366);
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Seed daily trend points for demo reset only. */
export function createDemoKpiHistory(boilers: Boiler[]): KpiSnapshot[] {
  const snapshots: KpiSnapshot[] = [];
  for (let daysAgo = 89; daysAgo >= 0; daysAgo -= 1) {
    const at = new Date(Date.now() - daysAgo * DAY_MS).toISOString();
    const drift = daysAgo * 0.02;
    const current = buildKpiSnapshot(boilers, at);
    const overdue = Math.max(
      0,
      Math.min(current.total, Math.round(current.overdue + drift))
    );
    const failed = Math.max(
      0,
      Math.min(current.total, Math.round(current.failed + (daysAgo % 5) * 0.1))
    );
    const compliant = Math.max(0, current.total - overdue - failed);
    snapshots.push({
      ...current,
      id: uid("kpi"),
      at,
      overdue,
      failed,
      compliant,
      complianceRate:
        current.total > 0
          ? Math.round((compliant / current.total) * 1000) / 10
          : 0,
    });
  }
  return dedupeKpiHistoryByDay(snapshots);
}

export function normalizeKpiHistory(
  raw: unknown,
  boilers: Boiler[]
): KpiSnapshot[] {
  const at = new Date().toISOString();
  if (!Array.isArray(raw) || raw.length === 0) {
    return recordDailyKpiSnapshot([], boilers, at);
  }
  const deduped = dedupeKpiHistoryByDay(raw as KpiSnapshot[]);
  return recordDailyKpiSnapshot(deduped, boilers, at);
}

export function snapshotMetricValue(
  snapshot: KpiSnapshot,
  metric: KpiTrendMetric
): string | number {
  switch (metric) {
    case "total":
      return snapshot.total;
    case "compliant":
      return snapshot.compliant;
    case "complianceRate":
      return snapshot.complianceRate;
    case "overdue":
      return snapshot.overdue;
    case "dueSoon":
      return snapshot.dueSoon;
    case "failed":
      return snapshot.failed;
    case "avgDowntime":
      return snapshot.avgDowntimeDays ?? "";
    default:
      return "";
  }
}
