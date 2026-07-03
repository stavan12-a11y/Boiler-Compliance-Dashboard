import type { Boiler } from "../types";
import {
  getBoilerStatus,
  getScheduleInfo,
  OVERDUE_CARD,
  STATUS_META,
} from "../lib/derive";
import { Warning } from "./ui";
import {
  AlertIcon,
  ArrowRightIcon,
  ClockIcon,
  CopyIcon,
  LayersIcon,
  MapPinIcon,
} from "./icons";

export function BoilerCard({
  boiler,
  onOpen,
  onDuplicate,
}: {
  boiler: Boiler;
  onOpen: () => void;
  onDuplicate: () => void;
}) {
  const status = getBoilerStatus(boiler);
  const meta = STATUS_META[status];
  const schedule = getScheduleInfo(boiler);
  const isOverdue = schedule.isOverdue;
  const showOverdueStyle = isOverdue && status !== "failed";
  const cardStyle = showOverdueStyle ? OVERDUE_CARD : meta;
  const bannerLabel = showOverdueStyle ? OVERDUE_CARD.label : meta.label;

  return (
    <div
      className={`card group flex flex-col overflow-hidden transition-all hover:shadow-card-hover ${cardStyle.cardRing}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wide ${cardStyle.cardBanner}`}
      >
        <span>{bannerLabel}</span>
        {status === "active" && !isOverdue && (
          <span className={`rounded px-1.5 py-0.5 ${meta.cardBadge}`}>
            In progress
          </span>
        )}
        {status === "passed" && !isOverdue && (
          <span className={`rounded px-1.5 py-0.5 ${meta.cardBadge}`}>
            Certified
          </span>
        )}
        {showOverdueStyle && (
          <span className={`rounded px-1.5 py-0.5 ${OVERDUE_CARD.cardBadge}`}>
            {schedule.daysOverdue}d overdue
          </span>
        )}
      </div>

      <button
        onClick={onOpen}
        className="flex flex-1 flex-col px-4 py-3 text-left"
        aria-label={`Open ${boiler.texasBoilerNumber || boiler.name}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Boiler
            </p>
            <h4 className="truncate text-lg font-bold text-slate-900">
              {boiler.name}
            </h4>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              <span className="font-medium text-slate-600">Texas Boiler #:</span>{" "}
              {boiler.texasBoilerNumber || "—"}
            </p>
          </div>
          <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-maroon-600" />
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <p className="flex items-center gap-1.5">
            <LayersIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{boiler.type || "—"}</span>
          </p>
          <p className="truncate pl-5">{boiler.manufacturer || "—"}</p>
          <p className="flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{boiler.location || "—"}</span>
          </p>
        </div>
      </button>

      <div
        className={`border-t px-4 py-2.5 ${
          showOverdueStyle ? OVERDUE_CARD.footer : "border-slate-100"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs ${
              showOverdueStyle ? OVERDUE_CARD.footerText : "text-slate-600"
            }`}
          >
            <ClockIcon
              className={`h-3.5 w-3.5 ${
                showOverdueStyle ? OVERDUE_CARD.footerIcon : "text-slate-400"
              }`}
            />
            Next due:{" "}
            <span className={showOverdueStyle ? "font-semibold" : "font-semibold text-slate-800"}>
              {schedule.nextDueLabel}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate faceplate for a similar boiler"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-maroon-700"
            >
              <CopyIcon className="h-3 w-3" />
              Duplicate
            </button>
            {isOverdue && (
              <Warning tone="danger">
                <AlertIcon className="h-3 w-3" />
                Overdue {schedule.daysOverdue}d
              </Warning>
            )}
            {schedule.isDueSoon && !isOverdue && (
              <Warning tone="warn">
                <ClockIcon className="h-3 w-3" />
                Due in {schedule.daysUntilDue}d
              </Warning>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
