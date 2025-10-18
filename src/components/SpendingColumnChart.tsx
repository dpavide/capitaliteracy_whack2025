import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

const rawTransactionData = [
  {
    "date": "06012021",
    "company-name": "Best Embarcadero Parking",
    "type": "travel",
    "amount": "25.00"
  },
  {
    "date": "06012021",
    "company-name": "AIG Insurance Adjustment 20-21",
    "type": "bills",
    "amount": "121.45"
  },
  {
    "date": "06022021",
    "company-name": "‘Ferry Building Marketplace",
    "type": "eating out",
    "amount": "76.80"
  },
  {
    "date": "06022021",
    "company-name": "76 Fuel 1150 Embarcadero",
    "type": "travel",
    "amount": "87.25"
  },
  {
    "date": "06042021",
    "company-name": "Trello Subscription",
    "type": "bills",
    "amount": "35.20"
  },
  {
    "date": "06042021",
    "company-name": "ATM Embarcadero Center",
    "type": "everything else",
    "amount": "200.00"
  },
  {
    "date": "06072021",
    "company-name": "Blue Bottle Cofee",
    "type":"eating out",
    "amount": "11.00"
  },
  {
    "date": "06072021",
    "company-name": "Best Embarcadero Parking",
    "type": "travel",
    "amount": "35.00"
  },
  {
    "date": "06072021",
    "company-name": "Docmosis Subscription",
    "type": "bills",
    "amount": "50.00"
  },
  {
    "date": "06072021",
    "company-name": "Embarcadero Centre Postage",
    "type": "everything else",
    "amount": "22.50"
  },
  {
    "date": "06072021",
    "company-name": "Bill Payment - Silicon Valley Graphic",
    "type": "bills",
    "amount": "450.00"
  },
  {
    "date": "06072021",
    "company-name": "Blue Bottle Cofee",
    "type": "eating out",
    "amount": "11.00"
  },
  {
    "date": "06082021",
    "company-name": "Ferry Building Marketplace",
    "type": "eating out",
    "amount": "85.50"
  },
  {
    "date": "06082021",
    "company-name": "Canva Subscription",
    "type": "bills",
    "amount": "125.00"
  },
  {
    "date": "06092021",
    "company-name": "76 Fuel 1150 Embarcadero",
    "type": "travel",
    "amount": "95.00"
  },
  {
    "date": "06102021",
    "company-name": "Embarcadero Centre Postage",
    "type": "everything else",
    "amount": "24.50"
  },
  {
    "date": "06102021",
    "company-name": "ATM Embarcadero Center",
    "type": "everything else",
    "amount": "300.00"
  },
  {
    "date": "06112021",
    "company-name": "Best Embarcadero Parking",
    "type": "travel",
    "amount": "7.50"
  },
  {
    "date": "06112021",
    "company-name": "Bill Payment - Silicon Valley Graphic",
    "type": "bills",
    "amount": "4500.00"
  },
  {
    "date": "06142021",
    "company-name": "Ferry Building Marketplace",
    "type": "eating out",
    "amount": "150.65"
  },
  {
    "date": "06142021",
    "company-name": "Bill Payment - Electricity",
    "type": "bills",
    "amount": "900.65"
  },
  {
    "date": "06142021",
    "company-name": "Best Embarcadero Parking",
    "type": "travel",
    "amount": "121.00"
  },
  {
    "date": "06142021",
    "company-name": "Embarcadero Centre Postage",
    "type": "everything else",
    "amount": "54.75"
  }
];

// Data processing function
const processColumnChartData = (data: typeof rawTransactionData) => {
  const categorySpending: { [key: string]: number } = {};

  data.forEach(transaction => {
    const amount = parseFloat(transaction.amount) || 0;
    const type = transaction.type || 'unknown';
    categorySpending[type] = (categorySpending[type] || 0) + amount;
  });

  // Format for column chart: { x: "Category", y: Amount }
  const chartData = Object.keys(categorySpending).map(type => ({
    x: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize type for display
    y: parseFloat(categorySpending[type].toFixed(2))
  }));

  // Sort by amount descending
  chartData.sort((a, b) => b.y - a.y);
  
  return chartData;
};

function SpendingColumnChart({
  chartType = 'Column',
  title = 'Spending by Category',
}: {
  chartType?: string;
  title?: string;
}) {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined' || !containerRef.current) return;

    const chartData = processColumnChartData(rawTransactionData);

    const options: any = {
      colors: ['#1A56DB'],
      series: [{ name: 'Amount', data: chartData }],
      chart: { type: 'bar', height: 420, fontFamily: 'Inter, sans-serif', toolbar: { show: false } }, // increased height
      title: {
        text: title,
        align: 'center',
        style: { fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', color: '#111827' },
      },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadiusApplication: 'end', borderRadius: 8 } },
      tooltip: { y: { formatter: (val: number) => `$${Number(val).toFixed(2)}` } },
      dataLabels: { enabled: false },
      grid: { show: false },
      legend: { show: false },
      xaxis: { labels: { style: { fontFamily: 'Inter, sans-serif' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (v: number) => '$' + Number(v).toFixed(0), style: { fontFamily: 'Inter, sans-serif' } } },
      fill: { opacity: 1 },
      responsive: [{ breakpoint: 480, options: { chart: { height: 360 } } }],
    };

    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch (e) {
        /* ignore */
      }
      chartRef.current = null;
    }

    try {
      chartRef.current = new ApexCharts(containerRef.current, options);
      chartRef.current.render();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('SpendingColumnChart: failed to render', err);
      chartRef.current = null;
    }

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch (e) {
          /* ignore */
        }
        chartRef.current = null;
      }
    };
  }, [title]); // re-run if title changes

  // Wrap the chart in the same white card container used by line & pie charts
  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h5>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{chartType} chart</span>
      </div>

      <div ref={containerRef} aria-label={`${title} - ${chartType} chart`} style={{ minHeight: 420 }} />
    </div>
  );
}

export default SpendingColumnChart;