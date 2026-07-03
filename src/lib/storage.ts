import type { ActivityEntry, Boiler, KpiSnapshot } from "../types";
import { recordDailyKpiSnapshot } from "./kpi";
import { createDemoBoilers } from "./demo";

const STORAGE_KEY = "boiler-inspection-management:v2";
const ACTIVITY_KEY = "boiler-inspection-management:activity:v1";
const KPI_HISTORY_KEY = "boiler-inspection-management:kpi-history:v1";

type LegacyBoiler = Omit<
  Boiler,
  "inspectionIntervalYears" | "stampedMawp" | "texasBoilerNumber" | "nationalBoardNumber"
> & {
  inspectionIntervalDays?: number;
  inspectionIntervalYears?: number;
  pressureRating?: string;
  stampedMawp?: string;
  texasBoilerNumber?: string;
  nationalBoardNumber?: string;
};

export function migrateBoiler(raw: LegacyBoiler): Boiler {
  const {
    inspectionIntervalDays: _days,
    pressureRating,
    inspectionIntervalYears: rawYears,
    stampedMawp,
    texasBoilerNumber,
    nationalBoardNumber,
    ...rest
  } = raw;

  const inspectionIntervalYears =
    typeof rawYears === "number"
      ? rawYears
      : (raw.inspectionIntervalDays ?? 365) / 365;

  return {
    ...rest,
    stampedMawp: stampedMawp ?? pressureRating ?? "",
    texasBoilerNumber: texasBoilerNumber ?? "",
    nationalBoardNumber: nationalBoardNumber ?? "",
    inspectionIntervalYears,
  } as Boiler;
}

export function migrateBoilers(raw: unknown[]): Boiler[] {
  return raw.map((b) => migrateBoiler(b as LegacyBoiler));
}

export function loadBoilers(): Boiler[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoBoilers();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createDemoBoilers();
    return migrateBoilers(parsed);
  } catch {
    return createDemoBoilers();
  }
}

export function saveBoilers(boilers: Boiler[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boilers));
  } catch {
    // Ignore quota / serialization errors — persistence is best-effort.
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadActivity(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveActivity(entries: ActivityEntry[]): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function loadKpiHistory(boilers: Boiler[]): KpiSnapshot[] {
  try {
    const raw = localStorage.getItem(KPI_HISTORY_KEY);
    if (!raw) {
      return recordDailyKpiSnapshot([], boilers, new Date().toISOString());
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return recordDailyKpiSnapshot([], boilers, new Date().toISOString());
    }
    return parsed as KpiSnapshot[];
  } catch {
    return recordDailyKpiSnapshot([], boilers, new Date().toISOString());
  }
}

export function saveKpiHistory(history: KpiSnapshot[]): void {
  try {
    localStorage.setItem(KPI_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}
