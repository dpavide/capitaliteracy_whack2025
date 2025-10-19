import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, useTheme, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { tokens } from '../../theme';

const Loading = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

  // get jobId from query string
  const params = new URLSearchParams(location.search);
  const jobId = params.get('jobId');

  useEffect(() => {
    if (!jobId) {
      setError('Missing job id.');
      return;
    }

    const sse = new EventSource(`/api/stream/${jobId}`);

    sse.addEventListener('ready', (e) => {
      // connected
      console.debug('SSE connected');
    });

    sse.addEventListener('status', (e) => {
      console.debug('status:', e.data);
      // you can parse and show status updates if you want
    });

    sse.addEventListener('complete', (e) => {
      console.debug('complete:', e.data);
      // job finished: navigate to main page with jobId
      sse.close();
      navigate(`/main?jobId=${jobId}`);
    });

    sse.onerror = (err) => {
      console.error('SSE error', err);
      setError('Connection error while waiting for results.');
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [jobId, navigate]);

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

      <Typography variant="h4" sx={{ color: colors.gray[100], fontWeight: 600, marginBottom: 1 }}>
        Processing your files...
      </Typography>

      <Typography variant="body1" sx={{ color: colors.gray[300], marginBottom: 2 }}>
        This may take a minute — we’ll show your results once it’s done.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default Loading;
