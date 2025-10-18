import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Link,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../theme';

const Login = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // TODO: Implement actual login logic when backend is ready
      console.log('Login submitted:', formData);
      // For now, just show success
      alert('Login successful! (Backend not yet implemented)');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.primary[400],
        padding: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: 450,
          width: '100%',
          backgroundColor: colors.primary[400],
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            textAlign: 'center',
            color: colors.gray[100],
            marginBottom: 3,
          }}
        >
          Welcome Back
        </Typography>

        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: colors.gray[300],
            marginBottom: 4,
          }}
        >
          Sign in to continue to your account
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email}
            margin="normal"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: colors.primary[200],
                },
                '&:hover fieldset': {
                  borderColor: colors.blueAccent[500],
                },
              },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: colors.primary[200],
                },
                '&:hover fieldset': {
                  borderColor: colors.blueAccent[500],
                },
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              marginTop: 3,
              marginBottom: 2,
              backgroundColor: colors.blueAccent[600],
              color: colors.gray[100],
              fontSize: 16,
              fontWeight: 600,
              padding: '12px',
              '&:hover': {
                backgroundColor: colors.blueAccent[700],
              },
            }}
          >
            Sign In
          </Button>

          <Box sx={{ textAlign: 'center', marginTop: 2 }}>
            <Typography variant="body2" color={colors.gray[300]}>
              Don't have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={() => navigate('/signup')}
                sx={{
                  color: colors.blueAccent[500],
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
