import type { Boiler, Inspection, KpiSnapshot, KpiTrendMetric } from "../types";
import { getBoilerStatus, getLastInspectedDate, STATUS_META } from "./derive";
import { KPI_FILTER_LABELS, KPI_TREND_LABELS, snapshotMetricValue } from "./kpi";
import { formatDate } from "./helpers";

function esc(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(esc).join(",");
}

function inspectionRows(boiler: Boiler, insp: Inspection, kind: string): string[] {
  const lines: string[] = [];
  lines.push(
    row([
      "Inspection",
      kind,
      boiler.name,
      `Date: ${insp.date}`,
      `Result: ${insp.result}`,
      `Status: ${insp.status}`,
      `Started: ${insp.startedAt}`,
      `Completed: ${insp.completedAt ?? ""}`,
      `Notes: ${insp.notes}`,
    ])
  );
  for (const step of insp.steps) {
    lines.push(
      row([
        "",
        "Step",
        step.label,
        step.completed ? "completed" : "pending",
        `Timestamp: ${step.completedAt ?? ""}`,
        `Notes: ${step.notes}`,
      ])
    );
  }
  for (const rep of insp.repairs) {
    lines.push(
      row(["", "Repair", `Logged: ${rep.loggedAt}`, `Detail: ${rep.description}`])
    );
  }
  return lines;
}

/** Build a detailed per-boiler CSV report. */
export function boilerToCsv(boiler: Boiler): string {
  const status = getBoilerStatus(boiler);
  const lines: string[] = [];

  lines.push("Section,Field,Value");
  lines.push(row(["Specs", "Name", boiler.name]));
  lines.push(row(["Specs", "Type", boiler.type]));
  lines.push(row(["Specs", "Capacity", boiler.capacity]));
  lines.push(row(["Specs", "Stamped MAWP", boiler.stampedMawp]));
  lines.push(row(["Specs", "Texas Boiler #", boiler.texasBoilerNumber]));
  lines.push(row(["Specs", "National Board Number", boiler.nationalBoardNumber]));
  lines.push(row(["Specs", "Boiler Use", boiler.boilerUse]));
  lines.push(row(["Specs", "Manufacturer", boiler.manufacturer]));
  lines.push(row(["Specs", "Install Date", boiler.installDate]));
  lines.push(row(["Specs", "Location", boiler.location]));
  lines.push(
    row(["Specs", "Inspection Interval (years)", boiler.inspectionIntervalYears])
  );
  lines.push(row(["Specs", "Current Status", STATUS_META[status].label]));
  lines.push(
    row(["Specs", "Last Inspected", getLastInspectedDate(boiler) ?? "Never"])
  );

  lines.push("");
  lines.push("Type,Kind,A,B,C,D,E,F,G,H");

  if (boiler.activeInspection) {
    for (const l of inspectionRows(boiler, boiler.activeInspection, "Active")) {
      lines.push(l);
    }
  }
  for (const h of boiler.history) {
    for (const l of inspectionRows(boiler, h, "Archived")) {
      lines.push(l);
    }
  }

  return lines.join("\r\n");
}

/** Build a flat fleet-wide CSV with one row per boiler plus rolled-up counts. */
export function fleetToCsv(boilers: Boiler[]): string {
  const header = [
    "Name",
    "Type",
    "Capacity",
    "Stamped MAWP",
    "Texas Boiler #",
    "National Board Number",
    "Boiler Use",
    "Manufacturer",
    "Install Date",
    "Location",
    "Inspection Interval (years)",
    "Status",
    "Last Inspected",
    "Active Inspection Date",
    "Active Result",
    "Steps Completed",
    "Repairs Logged",
    "Archived Inspections",
  ];
  const lines: string[] = [row(header)];

  for (const b of boilers) {
    const status = getBoilerStatus(b);
    const active = b.activeInspection;
    const stepsDone = active
      ? `${active.steps.filter((s) => s.completed).length}/${active.steps.length}`
      : "";
    lines.push(
      row([
        b.name,
        b.type,
        b.capacity,
        b.stampedMawp,
        b.texasBoilerNumber,
        b.nationalBoardNumber,
        b.boilerUse,
        b.manufacturer,
        b.installDate,
        b.location,
        b.inspectionIntervalYears,
        STATUS_META[status].label,
        getLastInspectedDate(b) ?? "Never",
        active?.date ?? "",
        active?.result ?? "",
        stepsDone,
        active?.repairs.length ?? 0,
        b.history.length,
      ])
    );
  }

  return lines.join("\r\n");
}

/** Fleet CSV scoped to a KPI category with a context header row. */
export function kpiBoilersToCsv(boilers: Boiler[], kpiKey: keyof typeof KPI_FILTER_LABELS): string {
  const label = KPI_FILTER_LABELS[kpiKey];
  const lines: string[] = [
    row(["KPI Category", label]),
    row(["Boiler Count", boilers.length]),
    row(["Exported At", new Date().toISOString()]),
    "",
  ];
  lines.push(fleetToCsv(boilers));
  return lines.join("\r\n");
}

/** Wide-format trend CSV for comparing KPI metrics over time. */
export function kpiTrendToCsv(
  snapshots: KpiSnapshot[],
  metrics: KpiTrendMetric[]
): string {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const header = ["Date", ...metrics.map((m) => KPI_TREND_LABELS[m])];
  const lines: string[] = [row(header)];
  for (const snap of sorted) {
    lines.push(
      row([
        formatDate(snap.at.slice(0, 10)),
        ...metrics.map((m) => snapshotMetricValue(snap, m)),
      ])
    );
  }
  return lines.join("\r\n");
}

/** One CSV file per KPI metric for side-by-side trend comparison. */
export function kpiTrendBundleCsv(
  snapshots: KpiSnapshot[],
  metrics: KpiTrendMetric[]
): string {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const lines: string[] = [
    row(["KPI Trend Comparison"]),
    row(["Snapshots", sorted.length]),
    row(["Exported At", new Date().toISOString()]),
    "",
  ];

  for (const metric of metrics) {
    lines.push(row(["Metric", KPI_TREND_LABELS[metric]]));
    lines.push(row(["Date", "Value"]));
    for (const snap of sorted) {
      lines.push(row([formatDate(snap.at.slice(0, 10)), snapshotMetricValue(snap, metric)]));
    }
    lines.push("");
  }

  return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
