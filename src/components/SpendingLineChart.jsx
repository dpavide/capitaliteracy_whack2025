import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

// raw transaction data (same shape used by pie/column charts)
const rawTransactionData = [
  { date: "06012021", "company-name": "Best Embarcadero Parking", type: "travel", amount: "25.00" },
  { date: "06012021", "company-name": "AIG Insurance Adjustment 20-21", type: "bills", amount: "121.45" },
  { date: "06022021", "company-name": "Ferry Building Marketplace", type: "eating out", amount: "76.80" },
  { date: "06022021", "company-name": "76 Fuel 1150 Embarcadero", type: "travel", amount: "87.25" },
  { date: "06042021", "company-name": "Trello Subscription", type: "bills", amount: "35.20" },
  { date: "06042021", "company-name": "ATM Embarcadero Center", type: "everything else", amount: "200.00" },
  { date: "06072021", "company-name": "Blue Bottle Cofee", type:"eating out", amount: "11.00" },
  { date: "06072021", "company-name": "Best Embarcadero Parking", type: "travel", amount: "35.00" },
  { date: "06072021", "company-name": "Docmosis Subscription", type: "bills", amount: "50.00" },
  { date: "06072021", "company-name": "Embarcadero Centre Postage", type: "everything else", amount: "22.50" },
  { date: "06072021", "company-name": "Bill Payment - Silicon Valley Graphic", type: "bills", amount: "450.00" },
  { date: "06072021", "company-name": "Blue Bottle Cofee", type: "eating out", amount: "11.00" },
  { date: "06082021", "company-name": "Ferry Building Marketplace", type: "eating out", amount: "85.50" },
  { date: "06082021", "company-name": "Canva Subscription", type: "bills", amount: "125.00" },
  { date: "06092021", "company-name": "76 Fuel 1150 Embarcadero", type: "travel", amount: "95.00" },
  { date: "06102021", "company-name": "Embarcadero Centre Postage", type: "everything else", amount: "24.50" },
  { date: "06102021", "company-name": "ATM Embarcadero Center", type: "everything else", amount: "300.00" },
  { date: "06112021", "company-name": "Best Embarcadero Parking", type: "travel", amount: "7.50" },
  { date: "06112021", "company-name": "Bill Payment - Silicon Valley Graphic", type: "bills", amount: "4500.00" },
  { date: "06142021", "company-name": "Ferry Building Marketplace", type: "eating out", amount: "150.65" },
  { date: "06142021", "company-name": "Bill Payment - Electricity", type: "bills", amount: "900.65" },
  { date: "06142021", "company-name": "Best Embarcadero Parking", type: "travel", amount: "121.00" },
  { date: "06142021", "company-name": "Embarcadero Centre Postage", type: "everything else", amount: "54.75" }
];

// aggregate transactions by date and return sorted labels + series
const processLineChartData = (data) => {
  const totalsByDate = {};
  data.forEach((t) => {
    const amt = parseFloat(t.amount) || 0;
    // date string like "06012021" -> normalize to YYYY-MM-DD for sorting
    const raw = String(t.date || '');
    if (raw.length === 8) {
      const mm = raw.slice(0, 2);
      const dd = raw.slice(2, 4);
      const yyyy = raw.slice(4, 8);
      const iso = `${yyyy}-${mm}-${dd}`;
      totalsByDate[iso] = (totalsByDate[iso] || 0) + amt;
    } else {
      // fallback group
      totalsByDate[raw] = (totalsByDate[raw] || 0) + amt;
    }
  });

  // sort dates ascending
  const entries = Object.entries(totalsByDate).sort((a, b) => {
    const da = new Date(a[0]).getTime();
    const db = new Date(b[0]).getTime();
    return da - db;
  });

  // labels like "06/01" and series numbers
  const labels = entries.map(([iso]) => {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${mm}/${dd}`;
    }
    return iso;
  });
  const series = entries.map(([, val]) => Number(val.toFixed(2)));
  return { labels, series };
};

function SpendingLineChart({ seriesData, categories, chartType = 'Line' } = {}) {
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // if props provided use them, otherwise compute from rawTransactionData
    let computed;
    if (Array.isArray(seriesData) && Array.isArray(categories)) {
      computed = { labels: categories, series: seriesData };
    } else {
      computed = processLineChartData(rawTransactionData);
    }

    const options = {
      chart: {
        height: 340,
        type: 'line',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
      },
      colors: ['#1A56DB'],
      tooltip: { enabled: true, x: { show: false } },
      dataLabels: { enabled: false },
      stroke: { width: 6, curve: 'smooth' },
      grid: { show: true, strokeDashArray: 4, padding: { left: 2, right: 2, top: -26 } },
      series: [{ name: 'Amount Spent', data: computed.series }],
      legend: { show: false },
      xaxis: { categories: computed.labels, labels: { style: { fontFamily: 'Inter, sans-serif' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (v) => '$' + Number(v).toFixed(0), style: { fontFamily: 'Inter, sans-serif' } } },
      responsive: [{ breakpoint: 480, options: { chart: { height: 260 }, stroke: { width: 3 } } }]
    };

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
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

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
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

      <div
        ref={containerRef}
        role="img"
        aria-label="Line chart showing daily spending"
        style={{ height: 340 }}
      />
    </div>
  );
}

export default SpendingLineChart;