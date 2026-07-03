import { useState } from "react";
import type { Boiler, Inspection } from "../types";
import { useFleet } from "../store";
import { inspectionDurationMs } from "../lib/derive";
import { formatDate, formatDuration, parseDate } from "../lib/helpers";
import {
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  TrashIcon,
} from "./icons";
import { EditableStepList, InspectionMeta, RepairList } from "./InspectionEditing";

function ResultPill({ result }: { result: Inspection["result"] }) {
  if (result === "pass") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckIcon className="h-3 w-3" /> Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
      <AlertIcon className="h-3 w-3" /> Failed
    </span>
  );
}

function HistoryEntry({
  boilerId,
  inspection,
}: {
  boilerId: string;
  inspection: Inspection;
}) {
  const { deleteInspection } = useFleet();
  const [open, setOpen] = useState(false);
  const durationMs = inspectionDurationMs(inspection);
  const showSteps = inspection.result === "pass" || inspection.steps.length > 0;
  const showRepairs =
    inspection.result === "fail" || inspection.repairs.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {formatDate(inspection.date)}
            </div>
            <div className="text-[11px] text-slate-400">
              {durationMs !== null && inspection.completedAt
                ? `Took ${formatDuration(
                    inspection.startedAt,
                    inspection.completedAt
                  )}`
                : "Duration n/a"}
            </div>
          </div>
        </div>
        <ResultPill result={inspection.result} />
      </button>

      {open && (
        <div className="animate-fade-in space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <InspectionMeta boilerId={boilerId} inspection={inspection} />

          {showSteps && (
            <div>
              <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Workflow timeline
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <EditableStepList
                  boilerId={boilerId}
                  inspection={inspection}
                  mode="history"
                />
              </div>
            </div>
          )}

          {showRepairs && (
            <RepairList boilerId={boilerId} inspection={inspection} />
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this archived inspection? This cannot be undone."
                  )
                ) {
                  deleteInspection(boilerId, inspection.id);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete inspection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryTab({ boiler }: { boiler: Boiler }) {
  if (boiler.history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
        <ClockIcon className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-medium text-slate-500">
          No archived inspections yet
        </p>
        <p className="text-xs text-slate-400">
          Completed inspection rounds will appear here once archived.
        </p>
      </div>
    );
  }

  const inspections = [...boiler.history].sort(
    (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
  );

  return (
    <div className="space-y-2.5">
      {inspections.map((insp) => (
        <HistoryEntry key={insp.id} boilerId={boiler.id} inspection={insp} />
      ))}
    </div>
  );
}
