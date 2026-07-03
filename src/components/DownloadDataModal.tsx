import { useEffect, useState } from "react";
import type { Boiler, KpiFilterKey, KpiSnapshot, KpiTrendMetric } from "../types";
import {
  downloadCsv,
  fleetToCsv,
  kpiBoilersToCsv,
  kpiTrendBundleCsv,
  kpiTrendToCsv,
  slugify,
} from "../lib/csv";
import { filterBoilersByKpi, KPI_FILTER_LABELS, KPI_TREND_LABELS } from "../lib/kpi";
import { CloseIcon, DownloadIcon } from "./icons";

const CURRENT_DOWNLOADS: {
  key: KpiFilterKey | "fleet";
  label: string;
  filename: string;
}[] = [
  { key: "fleet", label: "Full fleet register", filename: "fleet-register.csv" },
  {
    key: "compliant",
    label: "Compliant boilers",
    filename: "compliant-boilers.csv",
  },
  {
    key: "overdue",
    label: "Overdue inspections",
    filename: "overdue-boilers.csv",
  },
  {
    key: "dueSoon",
    label: "Due within 30 days",
    filename: "due-soon-boilers.csv",
  },
  {
    key: "failed",
    label: "Failed / needs repair",
    filename: "failed-boilers.csv",
  },
  {
    key: "withDowntime",
    label: "Boilers with downtime history",
    filename: "downtime-boilers.csv",
  },
];

const DEFAULT_TREND_METRICS: KpiTrendMetric[] = [
  "complianceRate",
  "overdue",
  "failed",
  "avgDowntime",
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

export function DownloadDataModal({
  boilers,
  kpiHistory,
  onClose,
}: {
  boilers: Boiler[];
  kpiHistory: KpiSnapshot[];
  onClose: () => void;
}) {
  const [trendMetrics, setTrendMetrics] =
    useState<KpiTrendMetric[]>(DEFAULT_TREND_METRICS);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function toggleMetric(metric: KpiTrendMetric) {
    setTrendMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  }

  function downloadCurrent(key: KpiFilterKey | "fleet") {
    if (key === "fleet") {
      downloadCsv("fleet-register.csv", fleetToCsv(boilers));
      return;
    }
    const subset = filterBoilersByKpi(boilers, key);
    const item = CURRENT_DOWNLOADS.find((d) => d.key === key);
    downloadCsv(
      item?.filename ?? `${slugify(KPI_FILTER_LABELS[key])}.csv`,
      kpiBoilersToCsv(subset, key)
    );
  }

  function downloadWideTrend() {
    if (trendMetrics.length === 0) return;
    downloadCsv(
      "kpi-trend-comparison.csv",
      kpiTrendToCsv(kpiHistory, trendMetrics)
    );
  }

  function downloadStackedTrend() {
    if (trendMetrics.length === 0) return;
    downloadCsv(
      "kpi-trend-by-metric.csv",
      kpiTrendBundleCsv(kpiHistory, trendMetrics)
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Download data</h2>
            <p className="text-sm text-slate-500">
              Export current KPI boiler lists or compare KPI trends over time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <Field label="Current snapshot">
          <div className="grid gap-2 sm:grid-cols-2">
            {CURRENT_DOWNLOADS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => downloadCurrent(item.key)}
                className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-maroon-200 hover:bg-maroon-50"
              >
                <span>{item.label}</span>
                <DownloadIcon className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </Field>

        <div className="my-5 border-t border-slate-100" />

        <Field label="KPI trend comparison">
          <p className="mb-3 text-xs text-slate-500">
            {kpiHistory.length} snapshots recorded. Select metrics to include in
            your trend export.
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KPI_TREND_LABELS) as KpiTrendMetric[]).map(
              (metric) => {
                const selected = trendMetrics.includes(metric);
                return (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => toggleMetric(metric)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? "bg-maroon-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {KPI_TREND_LABELS[metric]}
                  </button>
                );
              }
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={trendMetrics.length === 0}
              onClick={downloadWideTrend}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon className="h-4 w-4" />
              Download comparison table
            </button>
            <button
              type="button"
              disabled={trendMetrics.length === 0}
              onClick={downloadStackedTrend}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon className="h-4 w-4" />
              Download by metric
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Comparison table puts all selected KPIs in one sheet by date. By
            metric stacks each KPI separately for side-by-side charting.
          </p>
        </Field>
      </div>
    </div>
  );
}
