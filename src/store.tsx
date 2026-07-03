import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityEntry,
  AppState,
  Boiler,
  Inspection,
  InspectionResult,
  KpiSnapshot,
} from "./types";
import { WORKFLOW_STEPS } from "./types";
import { createDemoBoilers } from "./lib/demo";
import {
  loadActivity,
  loadBoilers,
  loadKpiHistory,
  migrateBoilers,
  saveActivity,
  saveBoilers,
  saveKpiHistory,
} from "./lib/storage";
import { appendKpiSnapshot, createDemoKpiHistory, normalizeKpiHistory } from "./lib/kpi";
import {
  isSupabaseConfigured,
  STATE_ROW_ID,
  STATE_TABLE,
  supabase,
} from "./lib/supabase";
import { useAuth } from "./auth/AuthContext";

export type SyncStatus = "local" | "loading" | "saving" | "saved" | "error";
import {
  formatDate,
  formatDateTime,
  freshWorkflowSteps,
  nowIso,
  uid,
} from "./lib/helpers";

const BOILER_FIELD_LABELS: Partial<Record<keyof Boiler, string>> = {
  name: "Name",
  type: "Type",
  capacity: "Capacity",
  stampedMawp: "Stamped MAWP",
  manufacturer: "Manufacturer",
  installDate: "Install date",
  location: "Location",
  texasBoilerNumber: "Texas boiler #",
  nationalBoardNumber: "National board number",
  inspectionIntervalYears: "Inspection interval (years)",
};

function trunc(value: string, max = 80): string {
  const v = (value ?? "").trim();
  if (!v) return "(empty)";
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

const MAX_ACTIVITY = 500;

export interface NewBoilerInput {
  name: string;
  type: string;
  capacity: string;
  stampedMawp: string;
  manufacturer: string;
  installDate: string;
  location: string;
  texasBoilerNumber: string;
  nationalBoardNumber: string;
  inspectionIntervalYears: number;
}

export interface StartInspectionInput {
  date: string;
  notes: string;
  result: InspectionResult;
}

interface FleetContextValue {
  boilers: Boiler[];
  addBoiler: (input: NewBoilerInput) => void;
  updateBoilerField: <K extends keyof Boiler>(
    boilerId: string,
    field: K,
    value: Boiler[K]
  ) => void;
  removeBoiler: (boilerId: string) => void;
  startInspection: (boilerId: string, input: StartInspectionInput) => void;
  /** Advance the active workflow; archives to history when the final step is done. */
  completeStep: (boilerId: string, stepKey: string, notes: string) => void;
  triggerReInspection: (boilerId: string) => void;
  /** Edit any inspection (active or archived) — date, notes, or pass/fail result. */
  editInspection: (
    boilerId: string,
    inspectionId: string,
    patch: Partial<Pick<Inspection, "date" | "notes" | "result">>
  ) => void;
  setStepNotes: (
    boilerId: string,
    inspectionId: string,
    stepKey: string,
    notes: string
  ) => void;
  setStepCompleted: (
    boilerId: string,
    inspectionId: string,
    stepKey: string,
    completed: boolean
  ) => void;
  /** Edit the timestamp captured for a completed step (ISO string). */
  setStepDate: (
    boilerId: string,
    inspectionId: string,
    stepKey: string,
    completedAt: string
  ) => void;
  addRepairLog: (
    boilerId: string,
    inspectionId: string,
    description: string
  ) => void;
  editRepairLog: (
    boilerId: string,
    inspectionId: string,
    repairId: string,
    description: string
  ) => void;
  setRepairDate: (
    boilerId: string,
    inspectionId: string,
    repairId: string,
    loggedAt: string
  ) => void;
  removeRepairLog: (
    boilerId: string,
    inspectionId: string,
    repairId: string
  ) => void;
  deleteInspection: (boilerId: string, inspectionId: string) => void;
  resetToDemo: () => void;
  /** Chronological audit trail of every change (most recent first). */
  activity: ActivityEntry[];
  clearActivity: () => void;
  /** Point-in-time KPI snapshots for trend comparison. */
  kpiHistory: KpiSnapshot[];
  /** Cloud sync state ('local' when running without Supabase). */
  syncStatus: SyncStatus;
}

const FleetContext = createContext<FleetContextValue | null>(null);

function mapBoiler(
  boilers: Boiler[],
  boilerId: string,
  updater: (boiler: Boiler) => Boiler
): Boiler[] {
  return boilers.map((b) => (b.id === boilerId ? updater(b) : b));
}

/** Apply an updater to whichever inspection (active or archived) matches the id. */
function mapInspection(
  boilers: Boiler[],
  boilerId: string,
  inspectionId: string,
  updater: (insp: Inspection) => Inspection
): Boiler[] {
  return mapBoiler(boilers, boilerId, (b) => {
    if (b.activeInspection && b.activeInspection.id === inspectionId) {
      return { ...b, activeInspection: updater(b.activeInspection) };
    }
    return {
      ...b,
      history: b.history.map((h) => (h.id === inspectionId ? updater(h) : h)),
    };
  });
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  const cloud = isSupabaseConfigured;

  const [boilers, setBoilers] = useState<Boiler[]>(() =>
    cloud ? [] : loadBoilers()
  );
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    cloud ? [] : loadActivity()
  );
  const [kpiHistory, setKpiHistory] = useState<KpiSnapshot[]>(() =>
    cloud ? [] : loadKpiHistory(loadBoilers())
  );
  const [synced, setSynced] = useState(!cloud);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    cloud ? "loading" : "local"
  );
  const firstRun = useRef(true);
  const applyingRemote = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kpiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a live ref of boilers so actions can read the "before" value of edits
  // without depending on a stale closure.
  const boilersRef = useRef(boilers);
  useEffect(() => {
    boilersRef.current = boilers;
  }, [boilers]);

  // --- Local mode: persist to localStorage ---------------------------------
  useEffect(() => {
    if (cloud) return;
    if (firstRun.current) {
      firstRun.current = false;
      // Persist initial (possibly demo) state so refreshes are stable.
      saveBoilers(boilers);
      return;
    }
    saveBoilers(boilers);
  }, [boilers, cloud]);

  useEffect(() => {
    if (cloud) return;
    saveActivity(activity);
  }, [activity, cloud]);

  useEffect(() => {
    if (cloud) return;
    saveKpiHistory(kpiHistory);
  }, [kpiHistory, cloud]);

  useEffect(() => {
    if (kpiTimer.current) clearTimeout(kpiTimer.current);
    kpiTimer.current = setTimeout(() => {
      setKpiHistory((prev) => appendKpiSnapshot(prev, boilersRef.current, nowIso()));
    }, 1500);
    return () => {
      if (kpiTimer.current) clearTimeout(kpiTimer.current);
    };
  }, [boilers]);

  // --- Cloud mode: load shared state + subscribe to live changes -----------
  useEffect(() => {
    if (!cloud || !authed || !supabase) return;
    const sb = supabase;
    let active = true;
    setSyncStatus("loading");

    (async () => {
      const { data: row, error } = await sb
        .from(STATE_TABLE)
        .select("data")
        .eq("id", STATE_ROW_ID)
        .maybeSingle();
      if (!active) return;

      if (!error && row?.data) {
        const state = row.data as Partial<AppState>;
        applyingRemote.current = true;
        setBoilers(
          Array.isArray(state.boilers) ? migrateBoilers(state.boilers) : []
        );
        setActivity(Array.isArray(state.activity) ? state.activity : []);
        setKpiHistory(
          normalizeKpiHistory(
            state.kpiHistory,
            Array.isArray(state.boilers) ? migrateBoilers(state.boilers) : []
          )
        );
      } else if (!error) {
        // First run: seed the shared table with the demo fleet.
        const demoBoilers = createDemoBoilers();
        const seed: AppState = {
          boilers: demoBoilers,
          activity: [],
          kpiHistory: createDemoKpiHistory(demoBoilers),
        };
        await sb
          .from(STATE_TABLE)
          .upsert({ id: STATE_ROW_ID, data: seed, updated_at: new Date().toISOString() });
        applyingRemote.current = true;
        setBoilers(seed.boilers);
        setActivity(seed.activity);
        setKpiHistory(seed.kpiHistory);
      }
      setSynced(true);
      setSyncStatus(error ? "error" : "saved");
    })();

    const channel = sb
      .channel("boiler_app_state_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: STATE_TABLE,
          filter: `id=eq.${STATE_ROW_ID}`,
        },
        (payload) => {
          const incoming = (payload.new as { data?: Partial<AppState> } | null)
            ?.data;
          if (incoming) {
            applyingRemote.current = true;
            setBoilers(
              Array.isArray(incoming.boilers)
                ? migrateBoilers(incoming.boilers)
                : []
            );
            setActivity(
              Array.isArray(incoming.activity) ? incoming.activity : []
            );
            setKpiHistory(
              normalizeKpiHistory(
                incoming.kpiHistory,
                Array.isArray(incoming.boilers)
                  ? migrateBoilers(incoming.boilers)
                  : []
              )
            );
            setSyncStatus("saved");
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [cloud, authed]);

  // --- Cloud mode: save local edits back to the shared state (debounced) ---
  useEffect(() => {
    if (!cloud || !authed || !synced || !supabase) return;
    if (applyingRemote.current) {
      // This change came from a remote update — don't echo it back.
      applyingRemote.current = false;
      return;
    }
    const sb = supabase;
    setSyncStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot: AppState = { boilers, activity, kpiHistory };
    saveTimer.current = setTimeout(() => {
      sb.from(STATE_TABLE)
        .upsert({
          id: STATE_ROW_ID,
          data: snapshot,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => setSyncStatus(error ? "error" : "saved"));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [boilers, activity, kpiHistory, cloud, authed, synced]);

  const pushLog = useCallback(
    (entry: Omit<ActivityEntry, "id" | "at">) => {
      setActivity((prev) =>
        [{ id: uid("log"), at: nowIso(), ...entry }, ...prev].slice(
          0,
          MAX_ACTIVITY
        )
      );
    },
    []
  );

  const findBoiler = useCallback(
    (boilerId: string) => boilersRef.current.find((b) => b.id === boilerId),
    []
  );

  const findInspection = useCallback(
    (boilerId: string, inspectionId: string) => {
      const boiler = boilersRef.current.find((b) => b.id === boilerId);
      if (!boiler) return { boiler: undefined, inspection: undefined };
      const inspection =
        boiler.activeInspection?.id === inspectionId
          ? boiler.activeInspection
          : boiler.history.find((h) => h.id === inspectionId);
      return { boiler, inspection };
    },
    []
  );

  const clearActivity = useCallback(() => setActivity([]), []);

  const addBoiler = useCallback(
    (input: NewBoilerInput) => {
      const newBoiler: Boiler = {
        id: uid("blr"),
        name: input.name,
        type: input.type,
        capacity: input.capacity,
        stampedMawp: input.stampedMawp,
        manufacturer: input.manufacturer,
        installDate: input.installDate,
        location: input.location,
        texasBoilerNumber: input.texasBoilerNumber,
        nationalBoardNumber: input.nationalBoardNumber,
        inspectionIntervalYears: input.inspectionIntervalYears,
        activeInspection: null,
        history: [],
      };
      setBoilers((prev) => [...prev, newBoiler]);
      pushLog({
        boilerId: newBoiler.id,
        boilerName: newBoiler.name,
        summary: "Added boiler to the fleet",
      });
    },
    [pushLog]
  );

  const updateBoilerField = useCallback(
    <K extends keyof Boiler>(boilerId: string, field: K, value: Boiler[K]) => {
      const before = findBoiler(boilerId);
      const oldValue = before ? before[field] : undefined;
      setBoilers((prev) =>
        mapBoiler(prev, boilerId, (b) => ({ ...b, [field]: value }))
      );
      if (before && String(oldValue) !== String(value)) {
        const label = BOILER_FIELD_LABELS[field] ?? String(field);
        pushLog({
          boilerId,
          boilerName:
            field === "name" ? String(value) || before.name : before.name,
          summary: `${label} changed`,
          from: trunc(String(oldValue ?? "")),
          to: trunc(String(value ?? "")),
        });
      }
    },
    [findBoiler, pushLog]
  );

  const removeBoiler = useCallback(
    (boilerId: string) => {
      const before = findBoiler(boilerId);
      setBoilers((prev) => prev.filter((b) => b.id !== boilerId));
      if (before) {
        pushLog({
          boilerId,
          boilerName: before.name,
          summary: "Removed boiler from the fleet",
        });
      }
    },
    [findBoiler, pushLog]
  );

  const startInspection = useCallback(
    (boilerId: string, input: StartInspectionInput) => {
      setBoilers((prev) =>
        mapBoiler(prev, boilerId, (b) => {
          const inspection: Inspection = {
            id: uid("insp"),
            date: input.date,
            startedAt: nowIso(),
            completedAt: null,
            notes: input.notes,
            result: input.result,
            steps: input.result === "pass" ? freshWorkflowSteps() : [],
            repairs: [],
            status: "in-progress",
          };
          return { ...b, activeInspection: inspection };
        })
      );
      const before = findBoiler(boilerId);
      pushLog({
        boilerId,
        boilerName: before?.name ?? "Boiler",
        summary: `Started a new inspection (${
          input.result === "pass" ? "passed" : "failed"
        }) dated ${formatDate(input.date)}`,
      });
    },
    [findBoiler, pushLog]
  );

  const completeStep = useCallback(
    (boilerId: string, stepKey: string, notes: string) => {
      const before = findBoiler(boilerId);
      const stepLabel =
        before?.activeInspection?.steps.find((s) => s.key === stepKey)?.label ??
        stepKey;
      let archived = false;
      setBoilers((prev) =>
        mapBoiler(prev, boilerId, (b) => {
          if (!b.activeInspection) return b;
          const insp = b.activeInspection;
          const steps = insp.steps.map((s) =>
            s.key === stepKey
              ? { ...s, completed: true, completedAt: nowIso(), notes }
              : s
          );
          const allDone = steps.every((s) => s.completed);
          if (allDone) {
            archived = true;
            // Final step done: mark complete and archive straight to history.
            const completed: Inspection = {
              ...insp,
              steps,
              status: "completed",
              completedAt: nowIso(),
            };
            return {
              ...b,
              activeInspection: null,
              history: [completed, ...b.history],
            };
          }
          return { ...b, activeInspection: { ...insp, steps } };
        })
      );
      if (before?.activeInspection) {
        pushLog({
          boilerId,
          boilerName: before.name,
          summary: `Completed step "${stepLabel}"`,
        });
        if (archived) {
          pushLog({
            boilerId,
            boilerName: before.name,
            summary: "Inspection completed and archived to history",
          });
        }
      }
    },
    [findBoiler, pushLog]
  );

  const triggerReInspection = useCallback(
    (boilerId: string) => {
      const before = findBoiler(boilerId);
      setBoilers((prev) =>
        mapBoiler(prev, boilerId, (b) => {
          if (!b.activeInspection) return b;
          // Archive the failed (now repaired) inspection and clear active so a
          // fresh inspection can be started.
          const archived: Inspection = {
            ...b.activeInspection,
            status: "completed",
            completedAt: b.activeInspection.completedAt ?? nowIso(),
          };
          return {
            ...b,
            history: [archived, ...b.history],
            activeInspection: null,
          };
        })
      );
      if (before?.activeInspection) {
        pushLog({
          boilerId,
          boilerName: before.name,
          summary: "Triggered re-inspection (archived the failed round)",
        });
      }
    },
    [findBoiler, pushLog]
  );

  const editInspection = useCallback(
    (
      boilerId: string,
      inspectionId: string,
      patch: Partial<Pick<Inspection, "date" | "notes" | "result">>
    ) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => {
          const next: Inspection = { ...insp, ...patch };
          // Switching a corrected inspection to "pass" needs a workflow to fill.
          if (patch.result === "pass" && next.steps.length === 0) {
            next.steps = freshWorkflowSteps();
          }
          return next;
        })
      );
      if (!boiler || !inspection) return;
      const tag = `inspection ${formatDate(inspection.date)}`;
      if (patch.date !== undefined && patch.date !== inspection.date) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Inspection date changed (${tag})`,
          from: formatDate(inspection.date),
          to: formatDate(patch.date),
        });
      }
      if (patch.result !== undefined && patch.result !== inspection.result) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Inspection outcome changed (${tag})`,
          from: inspection.result === "pass" ? "Passed" : "Failed",
          to: patch.result === "pass" ? "Passed" : "Failed",
        });
      }
      if (patch.notes !== undefined && patch.notes !== inspection.notes) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Inspection notes changed (${tag})`,
          from: trunc(inspection.notes),
          to: trunc(patch.notes),
        });
      }
    },
    [findInspection, pushLog]
  );

  const setStepNotes = useCallback(
    (boilerId: string, inspectionId: string, stepKey: string, notes: string) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      const step = inspection?.steps.find((s) => s.key === stepKey);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          steps: insp.steps.map((s) =>
            s.key === stepKey ? { ...s, notes } : s
          ),
        }))
      );
      if (boiler && step && step.notes !== notes) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Step "${step.label}" notes changed`,
          from: trunc(step.notes),
          to: trunc(notes),
        });
      }
    },
    [findInspection, pushLog]
  );

  const setStepCompleted = useCallback(
    (
      boilerId: string,
      inspectionId: string,
      stepKey: string,
      completed: boolean
    ) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      const step = inspection?.steps.find((s) => s.key === stepKey);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          steps: insp.steps.map((s) =>
            s.key === stepKey
              ? {
                  ...s,
                  completed,
                  completedAt: completed ? s.completedAt ?? nowIso() : null,
                }
              : s
          ),
        }))
      );
      if (boiler && step && step.completed !== completed) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Step "${step.label}" marked ${
            completed ? "done" : "not done"
          }`,
          from: step.completed ? "Done" : "Not done",
          to: completed ? "Done" : "Not done",
        });
      }
    },
    [findInspection, pushLog]
  );

  const setStepDate = useCallback(
    (
      boilerId: string,
      inspectionId: string,
      stepKey: string,
      completedAt: string
    ) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      const step = inspection?.steps.find((s) => s.key === stepKey);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          steps: insp.steps.map((s) =>
            s.key === stepKey ? { ...s, completedAt } : s
          ),
        }))
      );
      if (boiler && step && step.completedAt !== completedAt) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Step "${step.label}" date changed`,
          from: formatDateTime(step.completedAt),
          to: formatDateTime(completedAt),
        });
      }
    },
    [findInspection, pushLog]
  );

  const addRepairLog = useCallback(
    (boilerId: string, inspectionId: string, description: string) => {
      const { boiler } = findInspection(boilerId, inspectionId);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          repairs: [
            ...insp.repairs,
            { id: uid("rep"), loggedAt: nowIso(), description },
          ],
        }))
      );
      if (boiler) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: "Repair logged",
          to: trunc(description),
        });
      }
    },
    [findInspection, pushLog]
  );

  const editRepairLog = useCallback(
    (
      boilerId: string,
      inspectionId: string,
      repairId: string,
      description: string
    ) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      const repair = inspection?.repairs.find((r) => r.id === repairId);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          repairs: insp.repairs.map((r) =>
            r.id === repairId ? { ...r, description } : r
          ),
        }))
      );
      if (boiler && repair && repair.description !== description) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: "Repair description changed",
          from: trunc(repair.description),
          to: trunc(description),
        });
      }
    },
    [findInspection, pushLog]
  );

  const setRepairDate = useCallback(
    (
      boilerId: string,
      inspectionId: string,
      repairId: string,
      loggedAt: string
    ) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      const repair = inspection?.repairs.find((r) => r.id === repairId);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          repairs: insp.repairs.map((r) =>
            r.id === repairId ? { ...r, loggedAt } : r
          ),
        }))
      );
      if (boiler && repair && repair.loggedAt !== loggedAt) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: "Repair date changed",
          from: formatDateTime(repair.loggedAt),
          to: formatDateTime(loggedAt),
        });
      }
    },
    [findInspection, pushLog]
  );

  const removeRepairLog = useCallback(
    (boilerId: string, inspectionId: string, repairId: string) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      const repair = inspection?.repairs.find((r) => r.id === repairId);
      setBoilers((prev) =>
        mapInspection(prev, boilerId, inspectionId, (insp) => ({
          ...insp,
          repairs: insp.repairs.filter((r) => r.id !== repairId),
        }))
      );
      if (boiler && repair) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: "Repair removed",
          from: trunc(repair.description),
        });
      }
    },
    [findInspection, pushLog]
  );

  const deleteInspection = useCallback(
    (boilerId: string, inspectionId: string) => {
      const { boiler, inspection } = findInspection(boilerId, inspectionId);
      setBoilers((prev) =>
        mapBoiler(prev, boilerId, (b) => ({
          ...b,
          activeInspection:
            b.activeInspection?.id === inspectionId ? null : b.activeInspection,
          history: b.history.filter((h) => h.id !== inspectionId),
        }))
      );
      if (boiler && inspection) {
        pushLog({
          boilerId,
          boilerName: boiler.name,
          summary: `Deleted inspection dated ${formatDate(inspection.date)}`,
        });
      }
    },
    [findInspection, pushLog]
  );

  const resetToDemo = useCallback(() => {
    const demoBoilers = createDemoBoilers();
    setBoilers(demoBoilers);
    setActivity([]);
    setKpiHistory(createDemoKpiHistory(demoBoilers));
  }, []);

  const value = useMemo<FleetContextValue>(
    () => ({
      boilers,
      addBoiler,
      updateBoilerField,
      removeBoiler,
      startInspection,
      completeStep,
      triggerReInspection,
      editInspection,
      setStepNotes,
      setStepCompleted,
      setStepDate,
      addRepairLog,
      editRepairLog,
      setRepairDate,
      removeRepairLog,
      deleteInspection,
      resetToDemo,
      activity,
      clearActivity,
      kpiHistory,
      syncStatus,
    }),
    [
      boilers,
      addBoiler,
      updateBoilerField,
      removeBoiler,
      startInspection,
      completeStep,
      triggerReInspection,
      editInspection,
      setStepNotes,
      setStepCompleted,
      setStepDate,
      addRepairLog,
      editRepairLog,
      setRepairDate,
      removeRepairLog,
      deleteInspection,
      resetToDemo,
      activity,
      clearActivity,
      kpiHistory,
      syncStatus,
    ]
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within a FleetProvider");
  return ctx;
}

export { WORKFLOW_STEPS };
