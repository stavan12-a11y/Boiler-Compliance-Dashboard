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
  compliant: "Passed & complete",
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
  return getBoilerStatus(boiler) === "passed";
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

function snapshotMetricsDiffer(a: KpiSnapshot, b: KpiSnapshot): boolean {
  return (
    a.total !== b.total ||
    a.compliant !== b.compliant ||
    a.complianceRate !== b.complianceRate ||
    a.overdue !== b.overdue ||
    a.dueSoon !== b.dueSoon ||
    a.failed !== b.failed ||
    a.avgDowntimeDays !== b.avgDowntimeDays
  );
}

/** Append a snapshot when fleet KPIs change, or at most once per hour. */
export function appendKpiSnapshot(
  history: KpiSnapshot[],
  boilers: Boiler[],
  at: string
): KpiSnapshot[] {
  const next = buildKpiSnapshot(boilers, at);
  const last = history[0];
  if (last) {
    const hourMs = 60 * 60 * 1000;
    const elapsed = Date.now() - new Date(last.at).getTime();
    if (!snapshotMetricsDiffer(last, next) && elapsed < hourMs) {
      return history;
    }
  }
  return [next, ...history].slice(0, 365);
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Seed weekly trend points for demo / first-run dashboards. */
export function createDemoKpiHistory(boilers: Boiler[]): KpiSnapshot[] {
  const current = buildKpiSnapshot(boilers, new Date().toISOString());
  const snapshots: KpiSnapshot[] = [];

  for (let weeksAgo = 11; weeksAgo >= 0; weeksAgo -= 1) {
    const at = new Date(Date.now() - weeksAgo * 7 * DAY_MS).toISOString();
    const drift = weeksAgo * 0.4;
    const overdue = Math.max(
      0,
      Math.min(current.total, Math.round(current.overdue + drift - 1))
    );
    const failed = Math.max(
      0,
      Math.min(current.total, Math.round(current.failed + (weeksAgo % 3) - 1))
    );
    const dueSoon = Math.max(
      0,
      Math.min(current.total - overdue, current.dueSoon + (weeksAgo % 2))
    );
    const passed = boilers.filter((b) => getBoilerStatus(b) === "passed").length;
    const compliant = Math.max(
      0,
      Math.min(current.total, passed - Math.round(weeksAgo * 0.15))
    );
    const rate =
      current.total > 0
        ? Math.round((compliant / current.total) * 1000) / 10
        : 0;
    const avg =
      current.avgDowntimeDays !== null
        ? Math.max(
            0.5,
            Math.round((current.avgDowntimeDays + weeksAgo * 0.15) * 10) / 10
          )
        : null;

    snapshots.push({
      id: uid("kpi"),
      at,
      total: current.total,
      compliant,
      complianceRate: rate,
      overdue,
      dueSoon,
      failed,
      avgDowntimeDays: avg,
    });
  }

  return snapshots.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export function normalizeKpiHistory(
  raw: unknown,
  boilers: Boiler[]
): KpiSnapshot[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createDemoKpiHistory(boilers);
  }
  return raw as KpiSnapshot[];
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
