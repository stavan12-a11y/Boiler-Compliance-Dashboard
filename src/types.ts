export const WORKFLOW_STEPS = [
  { key: "inspection", label: "Inspection Done" },
  { key: "invoice", label: "Invoice Received" },
  { key: "po", label: "PO Issued" },
  { key: "certificate_received", label: "Certificate Received" },
  { key: "certificate_installed", label: "Certificate Installed" },
] as const;

export type WorkflowStepKey = (typeof WORKFLOW_STEPS)[number]["key"];

export interface WorkflowStep {
  key: WorkflowStepKey;
  label: string;
  completed: boolean;
  /** ISO timestamp captured when the step is marked complete. */
  completedAt: string | null;
  notes: string;
}

export interface RepairLog {
  id: string;
  /** ISO timestamp the repair was logged. */
  loggedAt: string;
  description: string;
}

export type InspectionResult = "pass" | "fail";
export type InspectionStatus = "in-progress" | "completed";

export interface Inspection {
  id: string;
  /** Calendar date of the inspection (yyyy-mm-dd). */
  date: string;
  /** ISO timestamp the inspection round started. */
  startedAt: string;
  /** ISO timestamp the inspection round was completed (all steps done). */
  completedAt: string | null;
  notes: string;
  result: InspectionResult;
  steps: WorkflowStep[];
  repairs: RepairLog[];
  status: InspectionStatus;
}

export interface Boiler {
  id: string;
  name: string;
  type: string;
  capacity: string;
  /** Maximum allowable working pressure stamped on the boiler nameplate. */
  stampedMawp: string;
  manufacturer: string;
  installDate: string;
  location: string;
  /** Texas state boiler registration number. */
  texasBoilerNumber: string;
  /** National Board registration number. */
  nationalBoardNumber: string;
  /** How often (in years) this boiler must be inspected. */
  inspectionIntervalYears: number;
  activeInspection: Inspection | null;
  history: Inspection[];
}

/** The full shared application state (persisted locally or to Supabase). */
export interface AppState {
  boilers: Boiler[];
  activity: ActivityEntry[];
  kpiHistory: KpiSnapshot[];
}

export interface ActivityEntry {
  id: string;
  /** ISO timestamp the change was recorded. */
  at: string;
  boilerId: string | null;
  boilerName: string;
  /** Short, human-readable description of what happened. */
  summary: string;
  /** Optional before value for edits. */
  from?: string;
  /** Optional after value for edits. */
  to?: string;
}

/**
 * Visual status derived from a boiler's inspection state.
 * - failed:  red   — failed its last inspection, needs repairs
 * - active:  amber — an inspection is underway
 * - passed:  green — passed and everything is complete
 * - none:    gray  — no inspection has been started yet
 */
export type BoilerStatus = "failed" | "active" | "passed" | "none";

export type KpiFilterKey =
  | "all"
  | "compliant"
  | "overdue"
  | "dueSoon"
  | "failed"
  | "withDowntime";

export type KpiTrendMetric =
  | "total"
  | "compliant"
  | "complianceRate"
  | "overdue"
  | "dueSoon"
  | "failed"
  | "avgDowntime";

/** Point-in-time fleet KPI metrics for trend comparison. */
export interface KpiSnapshot {
  id: string;
  /** ISO timestamp when the snapshot was recorded. */
  at: string;
  total: number;
  compliant: number;
  complianceRate: number;
  overdue: number;
  dueSoon: number;
  failed: number;
  avgDowntimeDays: number | null;
}
