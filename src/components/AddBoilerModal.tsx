import { useEffect, useState } from "react";
import { useFleet, type NewBoilerInput } from "../store";
import { CloseIcon, PlusIcon } from "./icons";

const EMPTY: NewBoilerInput = {
  name: "",
  type: "Fire-tube",
  capacity: "",
  stampedMawp: "",
  manufacturer: "",
  location: "",
  texasBoilerNumber: "",
  nationalBoardNumber: "",
  boilerUse: "",
  inspectionIntervalYears: 1,
};

const TYPES = [
  "Fire-tube",
  "Water-tube",
  "Electric",
  "Condensing",
  "Combi",
  "Other",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "input";

export function AddBoilerModal({
  onClose,
  initialValues,
}: {
  onClose: () => void;
  initialValues?: NewBoilerInput;
}) {
  const { addBoiler } = useFleet();
  const [form, setForm] = useState<NewBoilerInput>(() => initialValues ?? EMPTY);
  const isDuplicate = Boolean(initialValues?.duplicatedFrom);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set<K extends keyof NewBoilerInput>(key: K, value: NewBoilerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    addBoiler({
      ...form,
      name: form.name.trim(),
      location: form.location.trim() || "Unassigned",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="presentation"
        className="absolute inset-0"
        onMouseDown={onClose}
      />
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg animate-fade-in rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isDuplicate ? "Duplicate boiler" : "Add a boiler"}
            </h2>
            {isDuplicate && (
              <p className="mt-0.5 text-xs text-slate-500">
                Faceplate copied from{" "}
                <span className="font-semibold">{initialValues?.duplicatedFrom}</span>.
                Update the name and registration numbers.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Riverside A2"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={inputCls}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Capacity">
            <input
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              placeholder="e.g. 5,000 kg/h"
              className={inputCls}
            />
          </Field>
          <Field label="Stamped MAWP">
            <input
              value={form.stampedMawp}
              onChange={(e) => set("stampedMawp", e.target.value)}
              placeholder="e.g. 150 psi"
              className={inputCls}
            />
          </Field>
          <Field label="Texas boiler #">
            <input
              value={form.texasBoilerNumber}
              onChange={(e) => set("texasBoilerNumber", e.target.value)}
              placeholder="e.g. TX-4821"
              className={inputCls}
            />
          </Field>
          <Field label="National board number">
            <input
              value={form.nationalBoardNumber}
              onChange={(e) => set("nationalBoardNumber", e.target.value)}
              placeholder="e.g. NB-123456"
              className={inputCls}
            />
          </Field>
          <Field label="Manufacturer">
            <input
              value={form.manufacturer}
              onChange={(e) => set("manufacturer", e.target.value)}
              placeholder="e.g. Fulton"
              className={inputCls}
            />
          </Field>
          <Field label="Inspection interval (years)">
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={form.inspectionIntervalYears}
              onChange={(e) =>
                set("inspectionIntervalYears", Number(e.target.value) || 1)
              }
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Boiler use">
              <input
                value={form.boilerUse}
                onChange={(e) => set("boilerUse", e.target.value)}
                placeholder="e.g. Steam generation, process heat"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Location">
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Riverside Plant — Hall A"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            {isDuplicate ? "Create duplicate" : "Add boiler"}
          </button>
        </div>
      </form>
    </div>
  );
}
