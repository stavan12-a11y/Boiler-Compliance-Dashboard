import type { Boiler, BoilerStatus } from "../types";
import { WORKFLOW_STEPS } from "../types";
import {
  getBoilerStatus,
  getLastInspectedDate,
  getScheduleInfo,
  STATUS_META,
} from "../lib/derive";
import { formatDate } from "../lib/helpers";
import { Warning } from "./ui";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  DownloadIcon,
  GaugeIcon,
  LayersIcon,
  MapPinIcon,
  WrenchIcon,
} from "./icons";

const BANNER: Record<BoilerStatus, string> = {
  failed: "bg-red-600",
  active: "bg-amber-500",
  passed: "bg-emerald-600",
  none: "bg-slate-500",
};

type SegState = "done" | "current" | "pending";

const SEG_CLASS: Record<SegState, string> = {
  done: "bg-emerald-400",
  current: "bg-amber-400 animate-pulse",
  pending: "bg-slate-200",
};

/** A colour-coded 5-segment bar that makes the current workflow stage obvious. */
function StageStepper({ boiler }: { boiler: Boiler }) {
  const status = getBoilerStatus(boiler);
  const active = boiler.activeInspection;

  if (status === "failed") {
    const repairs = active?.repairs.length ?? 0;
    return (
      <div>
        <div className="flex gap-1">
          {WORKFLOW_STEPS.map((s) => (
            <span
              key={s.key}
              title={s.label}
              className="h-1.5 flex-1 rounded-full bg-rose-300"
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <WrenchIcon className="h-3.5 w-3.5" />
          Repairs in progress · {repairs} logged
        </div>
      </div>
    );
  }

  let segStates: SegState[];
  let label: string;
  let labelClass = "text-slate-500";
  let icon = <ClockIcon className="h-3.5 w-3.5" />;

  if (status === "active" && active) {
    const nextIndex = active.steps.findIndex((s) => !s.completed);
    segStates = active.steps.map((s, i) =>
      s.completed ? "done" : i === nextIndex ? "current" : "pending"
    );
    const current = nextIndex >= 0 ? active.steps[nextIndex] : null;
    label = current
      ? `${current.label} · stage ${nextIndex + 1} of ${active.steps.length}`
      : "All stages complete";
    labelClass = "text-amber-700";
    icon = <GaugeIcon className="h-3.5 w-3.5" />;
  } else if (status === "passed") {
    segStates = WORKFLOW_STEPS.map(() => "done");
    label = "All stages complete";
    labelClass = "text-emerald-700";
    icon = <CheckIcon className="h-3.5 w-3.5" />;
  } else {
    segStates = WORKFLOW_STEPS.map(() => "pending");
    label =
      boiler.history.length > 0 ? "Awaiting re-inspection" : "No inspection started";
  }

  return (
    <div>
      <div className="flex gap-1">
        {WORKFLOW_STEPS.map((s, i) => (
          <span
            key={s.key}
            title={`${s.label} — ${segStates[i]}`}
            className={`h-1.5 flex-1 rounded-full ${SEG_CLASS[segStates[i]]}`}
          />
        ))}
      </div>
      <div
        className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${labelClass}`}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

export function BoilerCard({
  boiler,
  onOpen,
  onExport,
}: {
  boiler: Boiler;
  onOpen: () => void;
  onExport: () => void;
}) {
  const status = getBoilerStatus(boiler);
  const meta = STATUS_META[status];
  const schedule = getScheduleInfo(boiler);
  const lastInspected = getLastInspectedDate(boiler);

  return (
    <div
      className={`card group flex flex-col overflow-hidden transition-all hover:shadow-card-hover ${
        status === "passed" ? "ring-2 ring-emerald-500/50" : ""
      } ${status === "failed" ? "ring-2 ring-red-500/40" : ""}`}
    >
      {/* Status banner */}
      <div
        className={`flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wide text-white ${BANNER[status]}`}
      >
        <span>{meta.label}</span>
        {status === "active" && (
          <span className="rounded bg-white/20 px-1.5 py-0.5">In progress</span>
        )}
        {status === "passed" && (
          <span className="rounded bg-white/20 px-1.5 py-0.5">Certified</span>
        )}
      </div>

      <button
        onClick={onOpen}
        className="flex-1 px-4 py-3 text-left"
        aria-label={`Open ${boiler.name}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Boiler
            </p>
            <h4 className="truncate text-lg font-bold text-slate-900">
              {boiler.name}
            </h4>
          </div>
          <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-maroon-700" />
        </div>

        <div className="mt-2 space-y-1.5 text-sm text-slate-600">
          <p className="flex items-center gap-1.5">
            <LayersIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {boiler.type} · {boiler.manufacturer}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <GaugeIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {boiler.capacity} · {boiler.pressureRating}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{boiler.location}</span>
          </p>
        </div>

        {/* Stage progress */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <StageStepper boiler={boiler} />
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <ClockIcon className="h-3 w-3" />
          {lastInspected
            ? `Last: ${formatDate(lastInspected)}`
            : "Never inspected"}
        </span>
        <div className="flex items-center gap-1.5">
          {schedule.isOverdue && (
            <Warning tone="danger">
              <AlertIcon className="h-3 w-3" />
              Overdue {schedule.daysOverdue}d
            </Warning>
          )}
          {schedule.isDueSoon && (
            <Warning tone="warn">
              <ClockIcon className="h-3 w-3" />
              Due {schedule.daysUntilDue}d
            </Warning>
          )}
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-maroon-700"
            title="Export this boiler to CSV"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
