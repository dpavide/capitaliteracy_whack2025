import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

// Stronger types for transactions
type Transaction = {
  date: string;
  'company-name': string;
  type: string;
  amount: string;
};

const rawTransactionData: Transaction[] = [
  {
    date: "06012021",
    "company-name": "Best Embarcadero Parking",
    type: "travel",
    amount: "25.00"
  },
  {
    date: "06012021",
    "company-name": "AIG Insurance Adjustment 20-21",
    type: "bills",
    amount: "121.45"
  },
  {
    date: "06022021",
    "company-name": "Ferry Building Marketplace",
    type: "eating out",
    amount: "76.80"
  },
  {
    date: "06022021",
    "company-name": "76 Fuel 1150 Embarcadero",
    type: "travel",
    amount: "87.25"
  },
  {
    date: "06042021",
    "company-name": "Trello Subscription",
    type: "bills",
    amount: "35.20"
  },
  {
    date: "06042021",
    "company-name": "ATM Embarcadero Center",
    type: "everything else",
    amount: "200.00"
  },
  {
    date: "06072021",
    "company-name": "Blue Bottle Cofee",
    type:"eating out",
    amount: "11.00"
  },
  {
    date: "06072021",
    "company-name": "Best Embarcadero Parking",
    type: "travel",
    amount: "35.00"
  },
  {
    date: "06072021",
    "company-name": "Docmosis Subscription",
    type: "bills",
    amount: "50.00"
  },
  {
    date: "06072021",
    "company-name": "Embarcadero Centre Postage",
    type: "everything else",
    amount: "22.50"
  },
  {
    date: "06072021",
    "company-name": "Bill Payment - Silicon Valley Graphic",
    type: "bills",
    amount: "450.00"
  },
  {
    date: "06072021",
    "company-name": "Blue Bottle Cofee",
    type: "eating out",
    amount: "11.00"
  },
  {
    date: "06082021",
    "company-name": "Ferry Building Marketplace",
    type: "eating out",
    amount: "85.50"
  },
  {
    date: "06082021",
    "company-name": "Canva Subscription",
    type: "bills",
    amount: "125.00"
  },
  {
    date: "06092021",
    "company-name": "76 Fuel 1150 Embarcadero",
    type: "travel",
    amount: "95.00"
  },
  {
    date: "06102021",
    "company-name": "Embarcadero Centre Postage",
    type: "everything else",
    amount: "24.50"
  },
  {
    date: "06102021",
    "company-name": "ATM Embarcadero Center",
    type: "everything else",
    amount: "300.00"
  },
  {
    date: "06112021",
    "company-name": "Best Embarcadero Parking",
    type: "travel",
    amount: "7.50"
  },
  {
    date: "06112021",
    "company-name": "Bill Payment - Silicon Valley Graphic",
    type: "bills",
    amount: "4500.00"
  },
  {
    date: "06142021",
    "company-name": "Ferry Building Marketplace",
    type: "eating out",
    amount: "150.65"
  },
  {
    date: "06142021",
    "company-name": "Bill Payment - Electricity",
    type: "bills",
    amount: "900.65"
  },
  {
    date: "06142021",
    "company-name": "Best Embarcadero Parking",
    type: "travel",
    amount: "121.00"
  },
  {
    date: "06142021",
    "company-name": "Embarcadero Centre Postage",
    type: "everything else",
    amount: "54.75"
  }
];

// Process data into labels + series with stable ordering
const processPieChartData = (data: Transaction[]) => {
  const categorySpending: Record<string, number> = {};

  data.forEach((transaction) => {
    const amount = Number.parseFloat(transaction.amount) || 0;
    const type = transaction.type || 'unknown';
    categorySpending[type] = (categorySpending[type] || 0) + amount;
  });

  const categories = Object.keys(categorySpending);
  const sorted = categories
    .map((label) => ({ label, amount: categorySpending[label] }))
    .sort((a, b) => b.amount - a.amount);

  return {
    labels: sorted.map((s) => s.label),
    series: sorted.map((s) => Number.parseFloat(s.amount.toFixed(2)))
  };
};

export default function SpendingPieChart({ chartType = 'Pie' }: { chartType?: string }): JSX.Element {
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('pie-chart');
    if (!el) return;

    const { labels, series } = processPieChartData(rawTransactionData);

    const options: any = {
      series,
      labels,
      colors: ["#1C64F2", "#16BDCA", "#9061F9", "#FDBA8C", "#E74694", "#6366F1", "#34D399"],
      chart: {
        height: 360,
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
          donut: { size: '60%' }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number, opts: any) {
          try {
            const idx = opts.seriesIndex;
            const value = opts?.w?.globals?.series?.[idx] ?? val;
            return `$${Number(value).toFixed(2)}`;
          } catch (e) {
            return `$${Number(val).toFixed(2)}`;
          }
        },
        style: { fontFamily: "Inter, sans-serif", fontSize: '12px' },
      },
      legend: {
        position: "bottom",
        labels: { useSeriesColors: true },
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return `$${Number(val).toFixed(2)}`;
          }
        }
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { height: 320 },
          }
        }
      ]
    };

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
      chartRef.current = null;
    }

    try {
      chartRef.current = new ApexCharts(el, options);
      chartRef.current.render();
    } catch (err) {
      chartRef.current = null;
      // eslint-disable-next-line no-console
      console.error('SpendingPieChart: failed to render chart', err);
    }

    return () => {
      if (chartRef.current) {
        try { chartRef.current.destroy(); } catch (e) { /* ignore */ }
        chartRef.current = null;
      }
    };
  }, []); // run once

  return (
    <div className="max-w-sm w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }} className="text-xl font-bold leading-none text-gray-900 dark:text-white me-1">Spending by Category</h5>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{chartType} chart</span>
      </div>

      <div className="py-6" id="pie-chart" style={{ minHeight: 360 }}></div>
    </div>
  );
}