import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

// 1. The user's raw JSON data
const inputData = {
  "transactions": [
    {
      "date-processed": "01-01-2025",
      "date-of-transaction": "",
      "company-name": "Opening Balance",
      "amount": "\u00a32,150.00",
      "balance": "\u00a32,150.00",
      "type": "opening_balance",
      "company-type": "Opening Balance",
      "card-type": "credit"
    },
    {
      "date-processed": "01-01-2025",
      "date-of-transaction": "",
      "company-name": "Opening Balance",
      "amount": "\u00a33,200.00",
      "balance": "\u00a33,200.00",
      "type": "opening_balance",
      "company-type": "Opening Balance",
      "card-type": "debit"
    },
    {
      "date-processed": "01-02-2025",
      "date-of-transaction": "01-02-2025",
      "company-name": "Amazon UK - Electronics",
      "amount": "\u00a3245.99",
      "balance": "\u00a32,395.99",
      "type": "deposit",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-processed": "01-03-2025",
      "date-of-transaction": "01-03-2025",
      "company-name": "John Lewis - Home Goods",
      "amount": "\u00a3189.50",
      "balance": "\u00a32,585.49",
      "type": "deposit",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-processed": "01-03-2025",
      "date-of-transaction": "01-03-2025",
      "company-name": "Mortgage Payment (30 yr @ 4.4%)",
      "amount": "\u00a31,402.13",
      "balance": "\u00a31,797.87",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-04-2025",
      "date-of-transaction": "01-04-2025",
      "company-name": "Shell Petrol - Canary Wharf",
      "amount": "\u00a345.00",
      "balance": "\u00a32,630.49",
      "type": "deposit",
      "company-type": "Everything Else",
      "card-type": "credit"
    },
    {
      "date-processed": "01-04-2025",
      "date-of-transaction": "01-04-2025",
      "company-name": "Sainsbury\u2019s Grocery",
      "amount": "\u00a392.45",
      "balance": "\u00a31,705.42",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-05-2025",
      "date-of-transaction": "01-05-2025",
      "company-name": "eBay - Vintage Clothing",
      "amount": "\u00a367.25",
      "balance": "\u00a32,697.74",
      "type": "deposit",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-processed": "01-05-2025",
      "date-of-transaction": "01-05-2025",
      "company-name": "Starbucks",
      "amount": "\u00a34.95",
      "balance": "\u00a31,700.47",
      "type": "withdrawal",
      "company-type": "Eating Out",
      "card-type": "debit"
    },
    {
      "date-processed": "01-06-2025",
      "date-of-transaction": "01-06-2025",
      "company-name": "Pret A Manger - Lunch",
      "amount": "\u00a38.75",
      "balance": "\u00a32,706.49",
      "type": "deposit",
      "company-type": "Eating Out",
      "card-type": "credit"
    },
    {
      "date-processed": "01-06-2025",
      "date-of-transaction": "01-06-2025",
      "company-name": "Shell Petrol",
      "amount": "\u00a360.00",
      "balance": "\u00a31,640.47",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-07-2025",
      "date-of-transaction": "01-07-2025",
      "company-name": "Salary (partial)",
      "amount": "\u00a32,000.00",
      "balance": "\u00a33,640.47",
      "type": "deposit",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-08-2025",
      "date-of-transaction": "01-08-2025",
      "company-name": "ASOS - Clothing",
      "amount": "\u00a3132.40",
      "balance": "\u00a31,838.89",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "credit"
    },
    {
      "date-processed": "01-09-2025",
      "date-of-transaction": "01-09-2025",
      "company-name": "Uber Eats - Food Delivery",
      "amount": "\u00a334.50",
      "balance": "\u00a31,873.39",
      "type": "deposit",
      "company-type": "Eating Out",
      "card-type": "credit"
    },
    {
      "date-processed": "01-09-2025",
      "date-of-transaction": "01-09-2025",
      "company-name": "Utility - Electricity Direct Debit",
      "amount": "\u00a385.60",
      "balance": "\u00a33,554.87",
      "type": "withdrawal",
      "company-type": "Bills",
      "card-type": "debit"
    },
    {
      "date-processed": "01-10-2025",
      "date-of-transaction": "01-10-2025",
      "company-name": "Apple Store - App Purchase",
      "amount": "\u00a32.99",
      "balance": "\u00a31,876.38",
      "type": "deposit",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-processed": "01-10-2025",
      "date-of-transaction": "01-10-2025",
      "company-name": "Gym Membership",
      "amount": "\u00a335.00",
      "balance": "\u00a33,519.87",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-11-2025",
      "date-of-transaction": "01-11-2025",
      "company-name": "British Airways - Flight Booking",
      "amount": "\u00a3650.00",
      "balance": "\u00a32,526.38",
      "type": "deposit",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-processed": "01-12-2025",
      "date-of-transaction": "01-12-2025",
      "company-name": "Waitrose - Grocery",
      "amount": "\u00a378.90",
      "balance": "\u00a32,605.28",
      "type": "deposit",
      "company-type": "Shopping",
      "card-type": "credit"
    },
    {
      "date-processed": "01-12-2025",
      "date-of-transaction": "01-12-2025",
      "company-name": "Tesco Grocery",
      "amount": "\u00a368.90",
      "balance": "\u00a33,450.97",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-13-2025",
      "date-of-transaction": "01-13-2025",
      "company-name": "Car Payment - BMW Finance",
      "amount": "\u00a3486.22",
      "balance": "\u00a33,091.50",
      "type": "deposit",
      "company-type": "Recurring Debts",
      "card-type": "credit"
    },
    {
      "date-processed": "01-14-2025",
      "date-of-transaction": "01-14-2025",
      "company-name": "Hotel Booking - Premier Inn",
      "amount": "\u00a3120.00",
      "balance": "\u00a33,211.50",
      "type": "deposit",
      "company-type": "Everything Else",
      "card-type": "credit"
    },
    {
      "date-processed": "01-14-2025",
      "date-of-transaction": "01-14-2025",
      "company-name": "Waitrose Grocery",
      "amount": "\u00a354.20",
      "balance": "\u00a33,396.77",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-15-2025",
      "date-of-transaction": "01-15-2025",
      "company-name": "Netflix Subscription",
      "amount": "\u00a310.99",
      "balance": "\u00a33,222.49",
      "type": "deposit",
      "company-type": "Everything Else",
      "card-type": "credit"
    },
    {
      "date-processed": "01-15-2025",
      "date-of-transaction": "01-15-2025",
      "company-name": "Netflix",
      "amount": "\u00a39.99",
      "balance": "\u00a33,386.78",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-16-2025",
      "date-of-transaction": "01-16-2025",
      "company-name": "Home Insurance (annual pro rata)",
      "amount": "\u00a345.00",
      "balance": "\u00a33,341.78",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-18-2025",
      "date-of-transaction": "01-18-2025",
      "company-name": "Coffee with friend",
      "amount": "\u00a37.20",
      "balance": "\u00a33,334.58",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-20-2025",
      "date-of-transaction": "01-20-2025",
      "company-name": "Primark - clothing",
      "amount": "\u00a368.00",
      "balance": "\u00a33,266.58",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-22-2025",
      "date-of-transaction": "01-22-2025",
      "company-name": "Phone Bill Direct Debit",
      "amount": "\u00a328.50",
      "balance": "\u00a33,238.08",
      "type": "withdrawal",
      "company-type": "Bills",
      "card-type": "debit"
    },
    {
      "date-processed": "01-25-2025",
      "date-of-transaction": "01-25-2025",
      "company-name": "Dining - Restaurant",
      "amount": "\u00a362.75",
      "balance": "\u00a33,175.33",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-30-2025",
      "date-of-transaction": "01-30-2025",
      "company-name": "Salary (net)",
      "amount": "\u00a33,800.00",
      "balance": "\u00a36,975.33",
      "type": "deposit",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-31-2025",
      "date-of-transaction": "01-31-2025",
      "company-name": "Council Tax",
      "amount": "\u00a3150.00",
      "balance": "\u00a36,825.33",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    },
    {
      "date-processed": "01-31-2025",
      "date-of-transaction": "01-31-2025",
      "company-name": "Sainsbury\u2019s Grocery",
      "amount": "\u00a374.25",
      "balance": "\u00a36,751.08",
      "type": "withdrawal",
      "company-type": "Everything Else",
      "card-type": "debit"
    }
  ],
  "summary": {
    "money_in": 7740.09,
    "money_out": 3116.52
  }
};

/**
 * 2. Helper function to transform the input data into the format
 * the line chart component expects.
 */
const transformData = (transactions) => {
  // Filter for spending transactions only
  const spending = transactions.filter(tx => {
    // 'withdrawal' is spending
    if (tx.type === 'withdrawal') return true;
    // 'deposit' on a 'credit' card is also spending
    if (tx.type === 'deposit' && tx['card-type'] === 'credit') return true;
    // 'opening_balance' and 'deposit' on 'debit' (salary) are not spending
    return false;
  });

  // Map to the required { date, "company-name", type, amount } format
  return spending.map(tx => {
    // Clean amount: remove '£' and ','
    const cleanedAmount = tx.amount.replace(/\u00a3/g, '').replace(/,/g, '');
    
    // Format date: "DD-MM-YYYY" -> "MMDDYYYY"
    const parts = tx['date-processed'].split('-');
    let formattedDate = '';
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      formattedDate = `${mm}${dd}${yyyy}`;
    }

    return {
      date: formattedDate,
      "company-name": tx['company-name'],
      type: tx['company-type'], // Use 'company-type' as the category
      amount: cleanedAmount
    };
  });
};

// 3. Call the transformation to get the data for the chart
const rawTransactionData = transformData(inputData.transactions);

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

  // labels like "01/02" (MM/DD) and series numbers
  const labels = entries.map(([iso]) => {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dd}/${mm}`; // Changed to DD/MM for UK format
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
      tooltip: { 
        enabled: true, 
        x: { show: false },
        y: {
          formatter: (v) => '£' + Number(v).toFixed(2) // Tooltip currency
        }
      },
      dataLabels: { enabled: false },
      stroke: { width: 6, curve: 'smooth' },
      grid: { show: true, strokeDashArray: 4, padding: { left: 2, right: 2, top: -26 } },
      series: [{ name: 'Amount Spent', data: computed.series }],
      legend: { show: false },
      xaxis: { categories: computed.labels, labels: { style: { fontFamily: 'Inter, sans-serif' } }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (v) => '£' + Number(v).toFixed(0), style: { fontFamily: 'Inter, sans-serif' } } }, // Y-axis currency
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