import type { Boiler } from "../types";
import { getBoilerStatus, STATUS_META } from "../lib/derive";
import {
  ArrowRightIcon,
  LayersIcon,
  MapPinIcon,
} from "./icons";

const BANNER: Record<ReturnType<typeof getBoilerStatus>, string> = {
  failed: "bg-red-600",
  active: "bg-amber-500",
  passed: "bg-emerald-600",
  none: "bg-slate-500",
};

export function BoilerCard({
  boiler,
  onOpen,
}: {
  boiler: Boiler;
  onOpen: () => void;
}) {
  const status = getBoilerStatus(boiler);
  const meta = STATUS_META[status];

  return (
    <div
      className={`card group flex flex-col overflow-hidden transition-all hover:shadow-card-hover ${
        status === "passed" ? "ring-2 ring-emerald-500/50" : ""
      } ${status === "failed" ? "ring-2 ring-red-500/40" : ""}`}
    >
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
        className="flex flex-1 flex-col px-4 py-3 text-left"
        aria-label={`Open ${boiler.texasBoilerNumber || boiler.name}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Texas boiler #
            </p>
            <h4 className="truncate text-lg font-bold text-slate-900">
              {boiler.texasBoilerNumber || "Not set"}
            </h4>
          </div>
          <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-maroon-700" />
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
    </div>
  );
}
