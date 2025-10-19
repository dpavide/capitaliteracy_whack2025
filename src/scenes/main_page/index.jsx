import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import SpendingLineChart from '../../components/SpendingLineChart';
import SpendingPieChart from '../../components/SpendingPieChart';
import InteractivePieChart from '../../components/InteractivePieChart';

const MainPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: colors.primary[400],
        padding: 3,
      }}
    >
      <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            color: colors.gray[100],
            textAlign: 'center',
            marginBottom: 3,
          }}
        >
          Financial Dashboard
        </Typography>

        {/* Tabs Slider */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: colors.primary[300],
            marginBottom: 4,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: colors.blueAccent[500],
                height: 3,
              },
            }}
          >
            <Tab
              label="Overview"
              sx={{
                color: colors.gray[300],
                fontSize: 16,
                fontWeight: 600,
                '&.Mui-selected': {
                  color: colors.blueAccent[500],
                },
                '&:hover': {
                  color: colors.blueAccent[400],
                },
              }}
            />
            <Tab
              label="Goals"
              sx={{
                color: colors.gray[300],
                fontSize: 16,
                fontWeight: 600,
                '&.Mui-selected': {
                  color: colors.blueAccent[500],
                },
                '&:hover': {
                  color: colors.blueAccent[400],
                },
              }}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Box>
            {/* Overview Tab - Pie at top, then daily spending line beneath */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
                width: '100%',
              }}
            >
              {/* Pie chart (top) - wider so legend fits */}
              <div style={{ width: '85%', maxWidth: 1100 }}>
                <SpendingPieChart />
              </div>

              {/* Daily spending time series (below pie) */}
              <div style={{ width: '65%', maxWidth: 900 }}>
                <SpendingLineChart />
              </div>
            </div>
          </Box>
        )}

        {activeTab === 1 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 4,
            }}
          >
            {/* Goals Tab - Interactive Pie Chart */}
            <InteractivePieChart />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MainPage;
