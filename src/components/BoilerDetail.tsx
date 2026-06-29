import { useEffect, useState } from "react";
import type { Boiler } from "../types";
import { useFleet } from "../store";
import {
  getBoilerStatus,
  getLastInspectedDate,
  getScheduleInfo,
} from "../lib/derive";
import { boilerToCsv, downloadCsv, slugify } from "../lib/csv";
import { formatDate } from "../lib/helpers";
import { EditableField, StatusBadge, Warning } from "./ui";
import { WorkflowPanel } from "./WorkflowPanel";
import { HistoryTab } from "./HistoryTab";
import {
  AlertIcon,
  ArrowLeftIcon,
  ClockIcon,
  DownloadIcon,
  GaugeIcon,
  LayersIcon,
  MapPinIcon,
  TrashIcon,
} from "./icons";

type Tab = "overview" | "history";

export function BoilerDetail({
  boiler,
  onClose,
}: {
  boiler: Boiler;
  onClose: () => void;
}) {
  const { updateBoilerField, removeBoiler } = useFleet();
  const [tab, setTab] = useState<Tab>("overview");
  const status = getBoilerStatus(boiler);
  const schedule = getScheduleInfo(boiler);
  const lastInspected = getLastInspectedDate(boiler);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function exportBoiler() {
    downloadCsv(`${slugify(boiler.name)}-report.csv`, boilerToCsv(boiler));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      {/* Full-width header */}
      <header className="sticky top-0 z-10 shadow-md">
        {/* Maroon top bar */}
        <div className="bg-maroon-900 text-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-maroon-100 transition hover:bg-white/10"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Back to fleet</span>
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {boiler.name}
                </h2>
                <p className="truncate text-[11px] text-maroon-200">
                  {boiler.type} · {boiler.location}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportBoiler}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* White sub-bar: status + tabs */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {schedule.isOverdue && (
                <Warning tone="danger">
                  <AlertIcon className="h-3 w-3" />
                  Overdue by {schedule.daysOverdue} days
                </Warning>
              )}
              {schedule.isDueSoon && (
                <Warning tone="warn">
                  <ClockIcon className="h-3 w-3" />
                  Due in {schedule.daysUntilDue} days
                </Warning>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-3 flex gap-1">
              {(["overview", "history"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition ${
                    tab === t
                      ? "bg-maroon-100 text-maroon-800"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {t}
                  {t === "history" && boiler.history.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600">
                      {boiler.history.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
          {tab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="card p-4">
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Technical specifications
                </h3>
                <div className="grid gap-1 sm:grid-cols-2">
                  <EditableField
                    label="Name"
                    value={boiler.name}
                    onCommit={(v) => updateBoilerField(boiler.id, "name", v)}
                  />
                  <EditableField
                    label="Type"
                    value={boiler.type}
                    icon={<LayersIcon className="h-3 w-3" />}
                    onCommit={(v) => updateBoilerField(boiler.id, "type", v)}
                  />
                  <EditableField
                    label="Capacity"
                    value={boiler.capacity}
                    icon={<GaugeIcon className="h-3 w-3" />}
                    onCommit={(v) => updateBoilerField(boiler.id, "capacity", v)}
                  />
                  <EditableField
                    label="Pressure rating"
                    value={boiler.pressureRating}
                    onCommit={(v) =>
                      updateBoilerField(boiler.id, "pressureRating", v)
                    }
                  />
                  <EditableField
                    label="Manufacturer"
                    value={boiler.manufacturer}
                    onCommit={(v) =>
                      updateBoilerField(boiler.id, "manufacturer", v)
                    }
                  />
                  <EditableField
                    label="Install date"
                    type="date"
                    value={boiler.installDate}
                    onCommit={(v) =>
                      updateBoilerField(boiler.id, "installDate", v)
                    }
                  />
                  <EditableField
                    label="Location"
                    value={boiler.location}
                    icon={<MapPinIcon className="h-3 w-3" />}
                    onCommit={(v) => updateBoilerField(boiler.id, "location", v)}
                  />
                  <EditableField
                    label="Inspection interval"
                    type="number"
                    suffix="days"
                    value={String(boiler.inspectionIntervalDays)}
                    onCommit={(v) => {
                      const n = Number(v);
                      if (Number.isFinite(n) && n > 0) {
                        updateBoilerField(
                          boiler.id,
                          "inspectionIntervalDays",
                          Math.round(n)
                        );
                      }
                    }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 px-3 text-xs text-slate-500">
                  <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                  Last inspected:{" "}
                  <span className="font-medium text-slate-700">
                    {lastInspected ? formatDate(lastInspected) : "Never"}
                  </span>
                  <span className="text-slate-300">·</span>
                  Next due:{" "}
                  <span className="font-medium text-slate-700">
                    {formatDate(schedule.nextDueDate.toISOString())}
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove "${boiler.name}" and all its inspection data? This cannot be undone.`
                        )
                      ) {
                        removeBoiler(boiler.id);
                        onClose();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Remove boiler
                  </button>
                </div>
              </section>

              <section>
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {boiler.activeInspection ? "Active inspection" : "Inspection"}
                </h3>
                <WorkflowPanel boiler={boiler} />
              </section>
            </div>
          ) : (
            <div className="max-w-3xl">
              <HistoryTab boiler={boiler} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
