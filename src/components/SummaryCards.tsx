import type { ReactNode } from "react";
import type { Boiler } from "../types";
import { getFleetStats } from "../lib/derive";
import { formatAverageDuration } from "../lib/helpers";
import { AlertIcon, ClockIcon, GaugeIcon, LayersIcon } from "./icons";

function Card({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          {label}
        </p>
        {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export function SummaryCards({ boilers }: { boilers: Boiler[] }) {
  const stats = getFleetStats(boilers);
  const avg = formatAverageDuration(stats.completedDurations);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        label="Total boilers"
        value={stats.total}
        icon={<LayersIcon className="h-5 w-5 text-slate-700" />}
        accent="bg-slate-100"
      />
      <Card
        label="Active inspections"
        value={stats.active}
        icon={<GaugeIcon className="h-5 w-5 text-amber-600" />}
        accent="bg-amber-50"
      />
      <Card
        label="Failed / needs repair"
        value={stats.failed}
        icon={<AlertIcon className="h-5 w-5 text-red-600" />}
        accent="bg-red-50"
      />
      <Card
        label="Avg. inspection time"
        value={avg}
        hint={`${stats.completedDurations.length} completed`}
        icon={<ClockIcon className="h-5 w-5 text-sky-600" />}
        accent="bg-sky-50"
      />
    </div>
  );
}
