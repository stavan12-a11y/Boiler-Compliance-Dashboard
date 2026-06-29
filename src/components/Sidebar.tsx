import type { Boiler } from "../types";
import { getBoilerStatus, getScheduleInfo } from "../lib/derive";
import { AlertIcon, ClockIcon, WrenchIcon } from "./icons";

export function Sidebar({
  boilers,
  onSelect,
}: {
  boilers: Boiler[];
  onSelect: (id: string) => void;
}) {
  const scheduled = boilers
    .map((b) => ({ boiler: b, schedule: getScheduleInfo(b) }))
    .filter(({ schedule }) => schedule.isOverdue || schedule.isDueSoon)
    .sort((a, b) => a.schedule.daysUntilDue - b.schedule.daysUntilDue);

  const overdue = scheduled.filter((s) => s.schedule.isOverdue);
  const dueSoon = scheduled.filter((s) => s.schedule.isDueSoon);

  const needsRepair = boilers.filter((b) => getBoilerStatus(b) === "failed");

  return (
    <aside className="space-y-4">
      {/* Schedule */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">
            Inspection schedule
          </h3>
        </div>

        {scheduled.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            All inspections up to date.
          </p>
        ) : (
          <div className="space-y-3">
            {overdue.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-500">
                  Overdue ({overdue.length})
                </div>
                <ul className="space-y-1.5">
                  {overdue.map(({ boiler, schedule }) => (
                    <li key={boiler.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(boiler.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-left transition hover:bg-rose-100"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {boiler.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {boiler.location}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 rounded-md bg-rose-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                          <AlertIcon className="h-3 w-3" />
                          {schedule.daysOverdue}d
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dueSoon.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-500">
                  Due soon ({dueSoon.length})
                </div>
                <ul className="space-y-1.5">
                  {dueSoon.map(({ boiler, schedule }) => (
                    <li key={boiler.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(boiler.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-left transition hover:bg-amber-100"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {boiler.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {boiler.location}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          {schedule.daysUntilDue}d
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Repairs */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <WrenchIcon className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800">Needs repairs</h3>
        </div>

        {needsRepair.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            No boilers awaiting repair.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {needsRepair.map((boiler) => {
              const repairs = boiler.activeInspection?.repairs.length ?? 0;
              return (
                <li key={boiler.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(boiler.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-left transition hover:bg-rose-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {boiler.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {boiler.location}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-rose-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                      {repairs} {repairs === 1 ? "repair" : "repairs"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
