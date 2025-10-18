import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, useTheme } from '@mui/material';
import { tokens } from '../../theme';
import SpendingLineChart from '../../components/SpendingLineChart';
import SpendingPieChart from '../../components/SpendingPieChart';
import SpendingColumnChart from '../../components/SpendingColumnChart';

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
            {/* Overview Tab - Existing Charts */}
            <div
              style={{
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
            {/* Goals Tab - Placeholder Content */}
            <Typography
              variant="h4"
              sx={{
                color: colors.gray[100],
                marginBottom: 2,
              }}
            >
              Financial Goals
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: colors.gray[300],
                textAlign: 'center',
                maxWidth: 600,
              }}
            >
              Set and track your financial goals here. This section will be implemented soon.
            </Typography>
            
            {/* Placeholder for future goals content */}
            <Box
              sx={{
                marginTop: 4,
                padding: 4,
                backgroundColor: colors.primary[500],
                borderRadius: 2,
                width: '100%',
                maxWidth: 800,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ color: colors.gray[200] }}>
                🎯 Goals Feature Coming Soon
              </Typography>
              <Typography variant="body2" sx={{ color: colors.gray[300], marginTop: 2 }}>
                Track savings goals, budget targets, and financial milestones
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MainPage;
