import React, { useEffect, useRef, useState } from "react";
import ApexCharts from "apexcharts";

type Transaction = {
  name: string;
  percentage: number;
};

type Props = {
  chartType?: string;
  backendUrl?: string; // defaults to http://localhost:3001
  jobId?: string; // optional: if present, fetch /api/spending/{jobId}
  pollIntervalMs?: number | null; // optional polling (null = no polling). default null.
};

const DEFAULT_COLORS = [
  "#1C64F2",
  "#16BDCA",
  "#9061F9",
  "#FDBA8C",
  "#E74694",
  "#6366F1",
  "#34D399",
];

// Accepts either an array [{name,percentage}] OR an object { name: pct, ... }
// Returns normalized Transaction[] preserving order (array case preserves order; object case preserves insertion order)
function normalizeServerPercentages(
  raw:
    | { percentages?: Record<string, number> | Array<{ name: string; percentage: number }> }
    | Array<{ name: string; percentage: number }>
    | Record<string, number>
    | null
): Transaction[] {
  if (!raw) return [];

  // If we got an array directly
  if (Array.isArray(raw)) {
    return raw.map((r) => ({ name: String((r as any).name ?? "unknown"), percentage: Number((r as any).percentage) || 0 }));
  }

  // If wrapper object with "percentages" field
  if ("percentages" in (raw as any)) {
    const p = (raw as any).percentages;
    if (!p) return [];
    if (Array.isArray(p)) {
      return p.map((r: any) => ({ name: String(r.name ?? "unknown"), percentage: Number(r.percentage) || 0 }));
    }
    // object map
    return Object.keys(p).map((k) => ({ name: k, percentage: Number(p[k]) || 0 }));
  }

  // If raw is an object map (name->value)
  if (typeof raw === "object") {
    return Object.keys(raw as any).map((k) => ({ name: k, percentage: Number((raw as any)[k]) || 0 }));
  }

  return [];
}

// Ensure percentages sum to 100 by normalizing / rounding reasonably.
// Keeps two decimal places for display but returns numeric series matching that.
function processPieChartData(data: Transaction[]) {
  // preserve first-seen order while aggregating by name
  const order: string[] = [];
  const aggregated: Record<string, number> = {};

  data.forEach((t) => {
    const label = String(t.name ?? "unknown");
    const val = Number(t.percentage) || 0;
    if (!(label in aggregated)) order.push(label);
    aggregated[label] = (aggregated[label] || 0) + val;
  });

  const labels = order;
  const seriesRaw = labels.map((l) => aggregated[l] || 0);

  const total = seriesRaw.reduce((s, v) => s + v, 0);

  if (total === 0) {
    // all zeros: return zeros and labels
    return {
      labels,
      series: seriesRaw.map((v) => Number(v.toFixed(2))),
    };
  }

  // Normalize so values sum to 100 (keep two decimals) while minimizing rounding drift.
  const exact = seriesRaw.map((v) => (v / total) * 100);
  const fixed = exact.map((v) => Math.floor(v * 100) / 100);
  let fixedSum = fixed.reduce((s, v) => s + v, 0);
  let remainder = Math.round((100 - fixedSum) * 100);

  const fractional = exact.map((v, i) => ({ idx: i, frac: v - fixed[i] }));
  fractional.sort((a, b) => b.frac - a.frac);

  const seriesHundredths = fixed.map((v) => Math.round(v * 100));
  let i = 0;
  while (remainder > 0 && i < fractional.length) {
    seriesHundredths[fractional[i].idx] += 1;
    remainder -= 1;
    i += 1;
    if (i >= fractional.length && remainder > 0) i = 0;
  }

  const finalSeries = seriesHundredths.map((h) => Number((h / 100).toFixed(2)));

  const sumFinal = finalSeries.reduce((s, v) => s + v, 0);
  const diff = Number((100 - sumFinal).toFixed(2));
  if (Math.abs(diff) >= 0.01 && finalSeries.length > 0) {
    let maxIdx = 0;
    for (let j = 1; j < finalSeries.length; j++) {
      if (finalSeries[j] > finalSeries[maxIdx]) maxIdx = j;
    }
    finalSeries[maxIdx] = Number((finalSeries[maxIdx] + diff).toFixed(2));
  }

  return {
    labels,
    series: finalSeries,
  };
}

export default function SpendingPieChart({
  chartType = "Pie",
  backendUrl = "http://localhost:3001",
  jobId,
  pollIntervalMs = null,
}: Props): JSX.Element {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchPercentagesOnce(signal?: AbortSignal) {
    try {
      const endpoint = jobId
        ? `${backendUrl.replace(/\/$/, "")}/api/spending/${encodeURIComponent(jobId)}`
        : `${backendUrl.replace(/\/$/, "")}/api/spending/latest`;
      const res = await fetch(endpoint, { method: "GET", signal });
      if (!res.ok) {
        console.warn("SpendingPieChart: non-OK response fetching percentages:", res.status);
        return [];
      }
      const payload = await res.json();
      const txns = normalizeServerPercentages(payload as any);
      return txns;
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        return [];
      }
      console.error("SpendingPieChart: fetch error", err);
      return [];
    }
  }

  useEffect(() => {
    let mounted = true;
    abortRef.current = new AbortController();

    async function initAndMaybePoll() {
      setLoading(true);
      const tdata = await fetchPercentagesOnce(abortRef.current?.signal);
      if (!mounted) return;
      setLoading(false);

      const { labels, series } = processPieChartData(tdata);

      const options: any = {
        series,
        labels,
        colors: DEFAULT_COLORS,
        chart: {
          height: 420,
          width: "100%",
          type: "pie",
          fontFamily: "Inter, sans-serif",
        },
        stroke: {
          colors: ["#ffffff"],
          lineCap: "round",
        },
        plotOptions: {
          pie: {
            expandOnClick: false,
            donut: { size: "60%" },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: function (val: number, opts: any) {
            try {
              const idx = opts.seriesIndex;
              const value = opts?.w?.globals?.series?.[idx];
              const num = value !== undefined ? Number(value) : Number(val);
              return `${num.toFixed(2)}%`;
            } catch (e) {
              return `${Number(val).toFixed(2)}%`;
            }
          },
          style: { fontFamily: "Inter, sans-serif", fontSize: "12px" },
        },
        legend: {
          position: "bottom",
          labels: { useSeriesColors: true },
          formatter: function (label: string, opts: any) {
            try {
              const idx = opts.seriesIndex;
              const value = opts?.w?.globals?.series?.[idx];
              if (value === undefined) return label;
              return `${label} — ${Number(value).toFixed(2)}%`;
            } catch {
              return label;
            }
          },
        },
        tooltip: {
          y: {
            formatter: function (val: number, opts: any) {
              try {
                const idx = opts.seriesIndex;
                const label = opts?.w?.globals?.labels?.[idx] ?? "";
                const value = opts?.w?.globals?.series?.[idx] ?? val;
                return `${label}: ${Number(value).toFixed(2)}%`;
              } catch (e) {
                return `${Number(val).toFixed(2)}%`;
              }
            },
          },
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: { height: 360 },
            },
          },
        ],
      };

      const el = containerRef.current;
      if (!el) return;

      if (chartRef.current) {
        try {
          chartRef.current.updateOptions({ labels, colors: DEFAULT_COLORS }, false, true);
          chartRef.current.updateSeries(series, true);
        } catch (e) {
          try {
            chartRef.current.destroy();
          } catch {}
          chartRef.current = new ApexCharts(el, options);
          chartRef.current.render();
        }
      } else {
        try {
          chartRef.current = new ApexCharts(el, options);
          chartRef.current.render();
        } catch (e) {
          console.error("SpendingPieChart: failed to render chart", e);
          chartRef.current = null;
        }
      }

      if (pollIntervalMs && pollIntervalMs > 0) {
        const interval = setInterval(async () => {
          const tdata2 = await fetchPercentagesOnce();
          if (!mounted) return;
          const { labels: newLabels, series: newSeries } = processPieChartData(tdata2);
          try {
            if (chartRef.current) {
              chartRef.current.updateOptions({ labels: newLabels }, false, true);
              chartRef.current.updateSeries(newSeries, true);
            }
          } catch (e) {
            console.error("SpendingPieChart: error updating chart during poll", e);
          }
        }, pollIntervalMs);
        (abortRef.current as any)._pollInterval = interval;
      }
    }

    initAndMaybePoll();

    return () => {
      mounted = false;
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      try {
        const interval = (abortRef.current as any)?._pollInterval;
        if (interval) clearInterval(interval);
      } catch {}
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {}
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl, jobId, pollIntervalMs]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }} className="text-xl font-bold leading-none text-gray-900 dark:text-white me-1">
          Spending by Category
        </h5>
        <span style={{ fontSize: 12, color: "#6B7280" }}>{chartType} chart</span>
      </div>

      <div ref={containerRef} className="py-6" id="pie-chart" style={{ minHeight: 420 }}></div>

      {/* Small status line */}
      <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
        {loading ? "Loading percentages..." : `Data source: ${jobId ? `job ${jobId}` : "latest"}`}
      </div>
    </div>
  );
}
