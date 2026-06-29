import type { Boiler, Inspection } from "../types";
import { getBoilerStatus, getLastInspectedDate, STATUS_META } from "./derive";

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
  lines.push(row(["Specs", "Pressure Rating", boiler.pressureRating]));
  lines.push(row(["Specs", "Manufacturer", boiler.manufacturer]));
  lines.push(row(["Specs", "Install Date", boiler.installDate]));
  lines.push(row(["Specs", "Location", boiler.location]));
  lines.push(
    row(["Specs", "Inspection Interval (days)", boiler.inspectionIntervalDays])
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
    "Pressure Rating",
    "Manufacturer",
    "Install Date",
    "Location",
    "Inspection Interval (days)",
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
        b.pressureRating,
        b.manufacturer,
        b.installDate,
        b.location,
        b.inspectionIntervalDays,
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
