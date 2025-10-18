import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { tokens } from '../../theme';

const Loading = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.primary[400],
      }}
    >
      <CircularProgress
        size={80}
        thickness={4}
        sx={{
          color: colors.blueAccent[500],
          marginBottom: 3,
        }}
      />
      
      <Typography
        variant="h4"
        sx={{
          color: colors.gray[100],
          fontWeight: 600,
          marginBottom: 1,
        }}
      >
        Loading...
      </Typography>
      
      <Typography
        variant="body1"
        sx={{
          color: colors.gray[300],
        }}
      >
        Please wait while we process your request
      </Typography>
    </Box>
  );
};

export default Loading;
