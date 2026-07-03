import type { ReactNode } from "react";
import type { Boiler } from "../types";
import { getFleetStats } from "../lib/derive";
import { complianceRate, countCompliant } from "../lib/kpi";
import { formatAverageDuration } from "../lib/helpers";
import { AlertIcon, CheckIcon, ClockIcon, LayersIcon } from "./icons";

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
  const rate = complianceRate(boilers);
  const avgDowntime = formatAverageDuration(stats.completedDurations);

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
      <Card
        label="Total boilers"
        value={stats.total}
        icon={<LayersIcon className="h-5 w-5 text-slate-700" />}
        accent="bg-slate-100"
      />
      <Card
        label="Compliance rate"
        value={`${rate}%`}
        hint={`${countCompliant(boilers)} compliant (not overdue)`}
        icon={<CheckIcon className="h-5 w-5 text-emerald-600" />}
        accent="bg-emerald-50"
      />
      <Card
        label="Overdue inspections"
        value={stats.overdue}
        hint={
          stats.dueSoon > 0 ? `${stats.dueSoon} due within 30 days` : undefined
        }
        icon={<ClockIcon className="h-5 w-5 text-orange-600" />}
        accent="bg-orange-50"
      />
      <Card
        label="Failed / needs repair"
        value={stats.failed}
        icon={<AlertIcon className="h-5 w-5 text-red-600" />}
        accent="bg-red-50"
      />
      <Card
        label="Average downtime"
        value={avgDowntime}
        hint={`${stats.completedDurations.length} completed inspections`}
        icon={<ClockIcon className="h-5 w-5 text-sky-600" />}
        accent="bg-sky-50"
      />
    </div>
  );
}
