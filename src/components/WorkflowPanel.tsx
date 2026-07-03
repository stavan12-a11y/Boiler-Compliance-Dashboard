import { useState } from "react";
import type { Boiler } from "../types";
import { useFleet } from "../store";
import { formatDate, formatDuration } from "../lib/helpers";
import { getMostRecentHistory, inspectionDurationMs } from "../lib/derive";
import {
  ActiveRepairFlow,
  EditableStepList,
  InspectionMeta,
} from "./InspectionEditing";
import { CheckIcon, PlusIcon, RefreshIcon } from "./icons";

function LastInspectionSummary({ boiler }: { boiler: Boiler }) {
  const last = getMostRecentHistory(boiler);
  if (!last) return null;

  if (last.result === "pass") {
    const durationMs = inspectionDurationMs(last);
    return (
      <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckIcon className="h-4 w-4" />
          Last inspection passed &amp; complete
        </div>
        <p className="mt-1 text-xs text-emerald-700">
          Completed {formatDate(last.date)}
          {durationMs !== null && last.completedAt && (
            <>
              {" "}
              in <strong>{formatDuration(last.startedAt, last.completedAt)}</strong>
            </>
          )}{" "}
          and archived to history. Start a new round below when it's due again.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
        <RefreshIcon className="h-4 w-4" />
        Re-inspection required
      </div>
      <p className="mt-1 text-xs text-amber-700">
        The last round failed on {formatDate(last.date)} and was sent for
        re-inspection after repairs. Start the new inspection below.
      </p>
    </div>
  );
}

function StartInspectionForm({ boiler }: { boiler: Boiler }) {
  const { startInspection } = useFleet();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<"pass" | "fail">("pass");

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <h4 className="text-sm font-semibold text-slate-800">
        Start a new inspection
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Record the inspection date, notes, and the initial outcome.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Inspection date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600"
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Outcome
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResult("pass")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                result === "pass"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Passed
            </button>
            <button
              type="button"
              onClick={() => setResult("fail")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                result === "fail"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Failed
            </button>
          </div>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Notes
        </span>
        <textarea
          value={notes}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            result === "pass"
              ? "Observations, readings, anything worth recording…"
              : "Describe the defects / reasons for failure…"
          }
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-maroon-600 focus:ring-1 focus:ring-maroon-600"
        />
      </label>

      <button
        type="button"
        onClick={() => startInspection(boiler.id, { date, notes, result })}
        className="btn-primary mt-4"
      >
        <PlusIcon className="h-4 w-4" />
        Begin inspection
      </button>
    </div>
  );
}

export function WorkflowPanel({ boiler }: { boiler: Boiler }) {
  const active = boiler.activeInspection;

  if (!active) {
    return (
      <div>
        <LastInspectionSummary boiler={boiler} />
        <StartInspectionForm boiler={boiler} />
      </div>
    );
  }

  if (active.result === "fail") {
    return (
      <div className="space-y-3">
        <InspectionMeta boilerId={boiler.id} inspection={active} />
        <ActiveRepairFlow boilerId={boiler.id} inspection={active} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <InspectionMeta boilerId={boiler.id} inspection={active} />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <EditableStepList boilerId={boiler.id} inspection={active} mode="active" />
        <p className="mt-2 px-1 text-[11px] text-slate-400">
          Click Complete once to advance each step. Future steps unlock as you
          finish the current one.
        </p>
      </div>
    </div>
  );
}
