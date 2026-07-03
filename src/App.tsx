import { useMemo, useState } from "react";
import { FleetProvider, useFleet } from "./store";
import { boilerToCsv, downloadCsv, slugify } from "./lib/csv";
import { getBoilerStatus } from "./lib/derive";
import type { BoilerStatus } from "./types";
import { SummaryCards } from "./components/SummaryCards";
import { BoilerCard } from "./components/BoilerCard";
import { Sidebar } from "./components/Sidebar";
import { BoilerDetail } from "./components/BoilerDetail";
import { AddBoilerModal } from "./components/AddBoilerModal";
import { DownloadDataModal } from "./components/DownloadDataModal";
import { SyncIndicator } from "./components/SyncIndicator";
import { StatusDot } from "./components/ui";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./auth/LoginScreen";
import {
  DownloadIcon,
  FlameIcon,
  LoaderIcon,
  LogOutIcon,
  PlusIcon,
  RefreshIcon,
} from "./components/icons";

const FILTERS: { key: BoilerStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Underway" },
  { key: "failed", label: "Needs repair" },
  { key: "passed", label: "Complete" },
  { key: "none", label: "Not started" },
];

function Dashboard() {
  const { boilers, resetToDemo, kpiHistory } = useFleet();
  const { logout } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [filter, setFilter] = useState<BoilerStatus | "all">("all");
  const [query, setQuery] = useState("");

  const selected = boilers.find((b) => b.id === selectedId) ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return boilers.filter((b) => {
      if (filter !== "all" && getBoilerStatus(b) !== filter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q) ||
        b.texasBoilerNumber.toLowerCase().includes(q) ||
        b.nationalBoardNumber.toLowerCase().includes(q)
      );
    });
  }, [boilers, filter, query]);

  function handleReset() {
    if (
      window.confirm(
        "Reset everything back to demo data? Your current changes will be lost."
      )
    ) {
      resetToDemo();
      setSelectedId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-maroon-800 bg-maroon-900 text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <FlameIcon className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold sm:text-lg">
                Boiler Inspection Management
              </h1>
              <p className="text-[11px] text-maroon-200 sm:text-xs">
                Fleet safety inspections &amp; compliance tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <SyncIndicator />
            <button
              type="button"
              onClick={() => setShowDownload(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 transition hover:bg-white/10"
              title="Download fleet and KPI data"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Download data</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 transition hover:bg-white/10"
              title="Reset to demo data"
            >
              <RefreshIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Sign out of the dashboard?")) logout();
              }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 transition hover:bg-white/10"
              title="Sign out"
            >
              <LogOutIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Fleet Compliance Overview
          </h2>
          <p className="text-sm text-slate-500">
            Inspection status and safety compliance across all monitored boilers.
          </p>
        </div>

        <SummaryCards boilers={boilers} />

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Boiler fleet</h3>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="btn-primary whitespace-nowrap"
              >
                <PlusIcon className="h-4 w-4" />
                Add boiler
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filter === f.key
                        ? "bg-maroon-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {f.key !== "all" && <StatusDot status={f.key} size="sm" />}
                    {f.label}
                  </button>
                ))}
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search boilers…"
                className="input w-44 sm:w-52"
              />
            </div>

            {visible.length === 0 ? (
              <div className="card p-10 text-center">
                <FlameIcon className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No boilers match your filters
                </p>
                <p className="text-xs text-slate-400">
                  Try a different filter or search term.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((boiler) => (
                  <BoilerCard
                    key={boiler.id}
                    boiler={boiler}
                    onOpen={() => setSelectedId(boiler.id)}
                    onExport={() =>
                      downloadCsv(
                        `${slugify(boiler.name)}-report.csv`,
                        boilerToCsv(boiler)
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <Sidebar boilers={boilers} onSelect={setSelectedId} />
        </div>
      </main>

      {selected && (
        <BoilerDetail boiler={selected} onClose={() => setSelectedId(null)} />
      )}
      {adding && <AddBoilerModal onClose={() => setAdding(false)} />}
      {showDownload && (
        <DownloadDataModal
          boilers={boilers}
          kpiHistory={kpiHistory}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}

function AuthedApp() {
  const { authed, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <LoaderIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!authed) return <LoginScreen />;

  return (
    <FleetProvider>
      <Dashboard />
    </FleetProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthedApp />
    </AuthProvider>
  );
}
