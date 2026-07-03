import type { ReactNode } from "react";
import type { Boiler, KpiFilterKey } from "../types";
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
  active,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `card flex w-full items-center gap-4 p-4 text-left transition ${
    onClick ? "cursor-pointer hover:shadow-card-hover" : ""
  } ${active ? "ring-2 ring-maroon-700 ring-offset-2" : ""}`;

  const body = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} title={`Show ${label.toLowerCase()}`}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function SummaryCards({
  boilers,
  activeKpi,
  onSelectKpi,
}: {
  boilers: Boiler[];
  activeKpi: KpiFilterKey;
  onSelectKpi: (kpi: KpiFilterKey) => void;
}) {
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
        active={activeKpi === "all"}
        onClick={() => onSelectKpi("all")}
      />
      <Card
        label="Compliance rate"
        value={`${rate}%`}
        hint={`${countCompliant(boilers)} of ${stats.total} compliant`}
        icon={<CheckIcon className="h-5 w-5 text-emerald-600" />}
        accent="bg-emerald-50"
        active={activeKpi === "compliant"}
        onClick={() => onSelectKpi("compliant")}
      />
      <Card
        label="Overdue inspections"
        value={stats.overdue}
        hint={
          stats.dueSoon > 0 ? `${stats.dueSoon} due within 30 days` : undefined
        }
        icon={<ClockIcon className="h-5 w-5 text-orange-600" />}
        accent="bg-orange-50"
        active={activeKpi === "overdue"}
        onClick={() => onSelectKpi("overdue")}
      />
      <Card
        label="Failed / needs repair"
        value={stats.failed}
        icon={<AlertIcon className="h-5 w-5 text-red-600" />}
        accent="bg-red-50"
        active={activeKpi === "failed"}
        onClick={() => onSelectKpi("failed")}
      />
      <Card
        label="Average downtime"
        value={avgDowntime}
        hint={`${stats.completedDurations.length} completed inspections`}
        icon={<ClockIcon className="h-5 w-5 text-sky-600" />}
        accent="bg-sky-50"
        active={activeKpi === "withDowntime"}
        onClick={() => onSelectKpi("withDowntime")}
      />
    </div>
  );
}