import { useState } from "react";
import type { Inspection } from "../types";
import { useFleet } from "../store";
import { isoToLocalInput, localInputToIso } from "../lib/helpers";
import { InlineText } from "./ui";
import {
  CheckIcon,
  ClockIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  WrenchIcon,
} from "./icons";

/** Editable date / result / notes header for any inspection. */
export function InspectionMeta({
  boilerId,
  inspection,
}: {
  boilerId: string;
  inspection: Inspection;
}) {
  const { editInspection } = useFleet();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Inspection date
          </span>
          <input
            type="date"
            value={inspection.date}
            onChange={(e) =>
              editInspection(boilerId, inspection.id, { date: e.target.value })
            }
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </label>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Outcome
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                editInspection(boilerId, inspection.id, { result: "pass" })
              }
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                inspection.result === "pass"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Passed
            </button>
            <button
              type="button"
              onClick={() =>
                editInspection(boilerId, inspection.id, { result: "fail" })
              }
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                inspection.result === "fail"
                  ? "border-rose-400 bg-rose-50 text-rose-700"
                  : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Failed
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <span className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Notes
        </span>
        <InlineText
          value={inspection.notes}
          placeholder="Add inspection notes…"
          onCommit={(v) => editInspection(boilerId, inspection.id, { notes: v })}
        />
      </div>
    </div>
  );
}

/** Inline, click-to-reveal editor for a completed step's timestamp. */
function StepDateField({
  boilerId,
  inspectionId,
  stepKey,
  completedAt,
}: {
  boilerId: string;
  inspectionId: string;
  stepKey: string;
  completedAt: string | null;
}) {
  const { setStepDate } = useFleet();
  return (
    <span className="flex items-center gap-1 text-[11px] text-slate-400">
      <ClockIcon className="h-3 w-3" />
      <input
        type="datetime-local"
        value={isoToLocalInput(completedAt)}
        onChange={(e) =>
          setStepDate(
            boilerId,
            inspectionId,
            stepKey,
            localInputToIso(e.target.value)
          )
        }
        title="Edit the date and time this step was completed"
        className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-slate-500 outline-none transition hover:border-slate-200 hover:bg-white focus:border-maroon-700 focus:bg-white focus:text-slate-700 focus:ring-1 focus:ring-maroon-700"
      />
    </span>
  );
}

/** Workflow step list. In "active" mode the next pending step can be advanced. */
export function EditableStepList({
  boilerId,
  inspection,
  mode,
}: {
  boilerId: string;
  inspection: Inspection;
  mode: "active" | "history";
}) {
  const { completeStep, setStepNotes, setStepCompleted } = useFleet();
  const steps = inspection.steps;
  const nextIndex = steps.findIndex((s) => !s.completed);
  const [stepNote, setStepNote] = useState("");
  const lastStepKey = steps[steps.length - 1]?.key;

  function advanceStep(stepKey: string) {
    completeStep(boilerId, stepKey, stepNote.trim());
    setStepNote("");
  }

  if (steps.length === 0) return null;

  return (
    <ol className="relative space-y-1">
      {steps.map((step, idx) => {
        const isCurrent = mode === "active" && idx === nextIndex;
        const isDone = step.completed;
        const isFuture =
          mode === "active" && nextIndex >= 0 && !isDone && idx > nextIndex;
        const isLast = idx === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-2">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
                  isDone ? "bg-emerald-300" : "bg-slate-200"
                }`}
              />
            )}
            <button
              type="button"
              disabled={isFuture}
              onMouseDown={(e) => {
                if (isFuture) return;
                if (isCurrent) {
                  e.preventDefault();
                  advanceStep(step.key);
                  return;
                }
                setStepCompleted(boilerId, inspection.id, step.key, !isDone);
              }}
              title={
                isFuture
                  ? "Complete earlier steps first"
                  : isDone
                  ? "Mark as not done"
                  : isCurrent
                  ? "Complete this step"
                  : "Mark as done"
              }
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                isFuture
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                  : isDone
                  ? "border-emerald-400 bg-emerald-400 text-white hover:bg-emerald-500"
                  : isCurrent
                  ? "border-maroon-700 bg-maroon-50 text-maroon-700 hover:bg-maroon-100"
                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
              }`}
            >
              {isDone ? <CheckIcon className="h-4 w-4" /> : idx + 1}
            </button>

            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    isDone
                      ? "text-slate-800"
                      : isCurrent
                      ? "text-maroon-800"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                {isDone && (
                  <StepDateField
                    boilerId={boilerId}
                    inspectionId={inspection.id}
                    stepKey={step.key}
                    completedAt={step.completedAt}
                  />
                )}
              </div>

              {/* Notes — always editable so mistakes can be fixed */}
              {(isDone || mode === "history") && (
                <div className="mt-1">
                  <InlineText
                    value={step.notes}
                    placeholder={`Notes for ${step.label.toLowerCase()}…`}
                    onCommit={(v) =>
                      setStepNotes(boilerId, inspection.id, step.key, v)
                    }
                  />
                </div>
              )}

              {isCurrent && (
                <div className="mt-2 rounded-lg border border-maroon-200 bg-maroon-50/50 p-3">
                  <textarea
                    value={stepNote}
                    rows={2}
                    onChange={(e) => setStepNote(e.target.value)}
                    placeholder={`Notes for ${step.label.toLowerCase()} (optional)…`}
                    className="w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      advanceStep(step.key);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    {step.key === lastStepKey
                      ? "Complete & archive inspection"
                      : `Complete ${step.label}`}
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Editable, deletable repair logs with an add field. */
export function RepairList({
  boilerId,
  inspection,
}: {
  boilerId: string;
  inspection: Inspection;
}) {
  const { addRepairLog, editRepairLog, removeRepairLog, setRepairDate } =
    useFleet();
  const [repair, setRepair] = useState("");

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <WrenchIcon className="h-3.5 w-3.5" /> Repair log
      </span>

      {inspection.repairs.length > 0 ? (
        <ul className="space-y-1.5">
          {inspection.repairs.map((rep) => (
            <li
              key={rep.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ClockIcon className="h-3 w-3" />
                  <input
                    type="datetime-local"
                    value={isoToLocalInput(rep.loggedAt)}
                    onChange={(e) =>
                      setRepairDate(
                        boilerId,
                        inspection.id,
                        rep.id,
                        localInputToIso(e.target.value)
                      )
                    }
                    title="Edit the date and time this repair was logged"
                    className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-slate-500 outline-none transition hover:border-slate-200 hover:bg-white focus:border-maroon-700 focus:bg-white focus:text-slate-700 focus:ring-1 focus:ring-maroon-700"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => removeRepairLog(boilerId, inspection.id, rep.id)}
                  className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  title="Delete repair"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <InlineText
                value={rep.description}
                placeholder="Describe the repair…"
                onCommit={(v) => editRepairLog(boilerId, inspection.id, rep.id, v)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-xs italic text-slate-400">
          No repairs logged yet.
        </p>
      )}

      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
        <textarea
          value={repair}
          rows={2}
          onChange={(e) => setRepair(e.target.value)}
          placeholder="Describe a repair carried out…"
          className="w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
        <button
          type="button"
          disabled={!repair.trim()}
          onClick={() => {
            addRepairLog(boilerId, inspection.id, repair.trim());
            setRepair("");
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Log repair
        </button>
      </div>
    </div>
  );
}

/** The repair flow shown for an active failed inspection. */
export function ActiveRepairFlow({
  boilerId,
  inspection,
}: {
  boilerId: string;
  inspection: Inspection;
}) {
  const { triggerReInspection } = useFleet();

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
        <WrenchIcon className="h-4 w-4" />
        Inspection failed — repairs required
      </div>
      <RepairList boilerId={boilerId} inspection={inspection} />
      <button
        type="button"
        disabled={inspection.repairs.length === 0}
        onClick={() => triggerReInspection(boilerId)}
        className="btn-primary mt-3"
        title={
          inspection.repairs.length === 0
            ? "Log at least one repair before re-inspecting"
            : undefined
        }
      >
        <RefreshIcon className="h-4 w-4" />
        Trigger re-inspection
      </button>
    </div>
  );
}
