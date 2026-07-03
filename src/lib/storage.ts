import type { ActivityEntry, Boiler } from "../types";
import { createDemoBoilers } from "./demo";

const STORAGE_KEY = "boiler-inspection-management:v2";
const ACTIVITY_KEY = "boiler-inspection-management:activity:v1";

type LegacyBoiler = Omit<Boiler, "inspectionIntervalYears"> & {
  inspectionIntervalDays?: number;
  inspectionIntervalYears?: number;
};

function migrateBoiler(raw: LegacyBoiler): Boiler {
  if (typeof raw.inspectionIntervalYears === "number") {
    return raw as Boiler;
  }
  const days = raw.inspectionIntervalDays ?? 365;
  const { inspectionIntervalDays: _legacy, ...rest } = raw;
  return {
    ...rest,
    inspectionIntervalYears: days / 365,
  } as Boiler;
}

export function loadBoilers(): Boiler[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemoBoilers();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createDemoBoilers();
    return parsed.map((b) => migrateBoiler(b as LegacyBoiler));
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
