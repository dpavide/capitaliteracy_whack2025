import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

function SpendingLineChart({ seriesData, categories, chartType = 'Line' } = {}) {
  const chartRef = useRef(null); // holds ApexCharts instance
  const containerRef = useRef(null); // DOM node for chart

  // fallback data (keeps component usable without props)
  const defaultSeries = [
    146.45, 164.05, 235.2, 579.5, 210.5, 95.0, 324.5, 4507.5, 1227.05,
  ];
  const defaultCategories = [
    '06/01',
    '06/02',
    '06/04',
    '06/07',
    '06/08',
    '06/09',
    '06/10',
    '06/11',
    '06/14',
  ];

  useEffect(() => {
    // Guard for SSR / tests
    if (typeof window === 'undefined' || !containerRef.current) return;

    const options = {
      chart: {
        height: 340, // increased height
        type: 'line',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
      },
      colors: ['#1A56DB'],
      tooltip: { enabled: true, x: { show: false } },
      dataLabels: { enabled: false },
      stroke: { width: 6, curve: 'smooth' },
      grid: {
        show: true,
        strokeDashArray: 4,
        padding: { left: 2, right: 2, top: -26 },
      },
      series: [
        {
          name: 'Amount Spent',
          data: Array.isArray(seriesData) ? seriesData : defaultSeries,
        },
      ],
      legend: { show: false },
      xaxis: {
        categories: Array.isArray(categories) ? categories : defaultCategories,
        labels: {
          style: { fontFamily: 'Inter, sans-serif' },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (v) => '$' + Number(v).toFixed(0),
          style: { fontFamily: 'Inter, sans-serif' },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { height: 260 },
            stroke: { width: 3 },
          },
        },
      ],
    };

    // destroy existing instance (handles StrictMode double-mounts)
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch (e) {
        // ignore
      }
      chartRef.current = null;
    }

    try {
      chartRef.current = new ApexCharts(containerRef.current, options);
      chartRef.current.render();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('SpendingLineChart: failed to render chart', err);
      chartRef.current = null;
    }

    // cleanup
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch (e) {
          // ignore
        }
        chartRef.current = null;
      }
    };
  }, [seriesData, categories]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }} className="text-xl font-bold leading-none text-gray-900 dark:text-white pe-1">
          Daily Spending
        </h5>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{chartType} chart</span>
      </div>

      {/* chart container uses ref instead of id for robustness */}
      <div
        ref={containerRef}
        role="img"
        aria-label="Line chart showing daily spending"
        style={{ height: 340 }} // match chart height
      />

      <div className="grid grid-cols-1 items-center border-gray-200 border-t dark:border-gray-700 justify-between mt-2.5">
        <div className="pt-5">
        </div>
      </div>
    </div>
  );
}

export default SpendingLineChart;