// Loading.jsx
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

    // Generic message listener in case server sends plain "message" events
    sse.addEventListener('message', (e) => {
      try {
        const payload = JSON.parse(e.data);
        // handle older/other payloads if needed
        if (payload && payload.event === 'completed') {
          sse.close();
          navigate(`/main_page`);
        } else if (payload && payload.event === 'error') {
          setError(payload.error || 'Processing error occurred.');
          sse.close();
        }
      } catch (err) {
        // ignore JSON parse errors
        console.debug('SSE message (non-json) received', e.data);
      }
    });

    // status updates
    sse.addEventListener('status', (e) => {
      try {
        const payload = JSON.parse(e.data);
        console.debug('status update:', payload);
      } catch (err) {
        console.debug('status (non-json):', e.data);
      }
    });

    // Completed event (this is what the server sends now)
    sse.addEventListener('completed', (e) => {
      console.debug('completed:', e.data);
      sse.close();
      navigate(`/main_page`);
    });

    // Started event (optional)
    sse.addEventListener('started', (e) => {
      console.debug('processing started:', e.data);
    });

    // Error event sent by server (custom)
    sse.addEventListener('error', (e) => {
      try {
        const payload = JSON.parse(e.data);
        setError(payload.error || 'An error occurred during processing.');
      } catch (err) {
        setError('An error occurred during processing.');
      }
      sse.close();
    });

    sse.onerror = (err) => {
      console.error('SSE connection error', err);
      // EventSource may transiently try to reconnect. Only show an error if connection closed.
      // We'll set a gentle error message but keep the connection; on many browsers, network hiccups cause reconnect attempts.
      // If you want to treat any error as fatal, uncomment the lines below.
      // setError('Connection error while waiting for results.');
      // sse.close();
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
