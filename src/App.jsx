import React from 'react';
import SpendingLineChart from './components/SpendingLineChart';
import SpendingPieChart from './components/SpendingPieChart';
import SpendingColumnChart from './components/SpendingColumnChart';

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Minimal App</h1>

      {/* Stack charts vertically, centered, with controlled width ratios */}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
        }}
      >
        <div style={{ width: '65%', maxWidth: 900 }}>
          <SpendingLineChart />
        </div>

        <div style={{ width: '65%', maxWidth: 900 }}>
          <SpendingColumnChart />
        </div>

        {/* Pie chart a bit wider so legend fits nicely */}
        <div style={{ width: '85%', maxWidth: 1100 }}>
          <SpendingPieChart />
        </div>
      </div>
    </div>
  );
}
