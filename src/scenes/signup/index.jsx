import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Link,
  useTheme,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../theme';

const SignUp = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    creditScore: '',
    numericalLiteracy: '',
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

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

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

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Age validation
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        newErrors.age = 'Age must be between 18 and 120';
      }
    }

    // Credit Score validation
    if (!formData.creditScore) {
      newErrors.creditScore = 'Credit score is required';
    } else {
      const scoreNum = parseInt(formData.creditScore);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 999) {
        newErrors.creditScore = 'Credit score must be between 0 and 999';
      }
    }

    // Numerical Literacy validation
    if (!formData.numericalLiteracy) {
      newErrors.numericalLiteracy = 'Numerical literacy level is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // TODO: Implement actual signup logic when backend is ready
      const { confirmPassword, ...submitData } = formData;
      console.log('Sign up submitted:', submitData);
      // For now, just show success
      alert('Sign up successful! (Backend not yet implemented)');
      // Optionally navigate to login
      navigate('/login');
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
          maxWidth: 500,
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
            marginBottom: 2,
          }}
        >
          Create Account
        </Typography>

        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: colors.gray[300],
            marginBottom: 3,
          }}
        >
          Sign up to get started
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            error={!!errors.fullName}
            helperText={errors.fullName}
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

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
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

          <Box sx={{ display: 'flex', gap: 2, marginTop: 2 }}>
            <TextField
              fullWidth
              label="Age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              error={!!errors.age}
              helperText={errors.age}
              inputProps={{ min: 18, max: 120 }}
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
              label="Credit Score"
              name="creditScore"
              type="number"
              value={formData.creditScore}
              onChange={handleChange}
              error={!!errors.creditScore}
              helperText={errors.creditScore}
              inputProps={{ min: 0, max: 999 }}
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
          </Box>

          <FormControl
            fullWidth
            margin="normal"
            error={!!errors.numericalLiteracy}
            sx={{ marginTop: 2 }}
          >
            <InputLabel id="numerical-literacy-label">
              Numerical Literacy
            </InputLabel>
            <Select
              labelId="numerical-literacy-label"
              id="numerical-literacy"
              name="numericalLiteracy"
              value={formData.numericalLiteracy}
              onChange={handleChange}
              label="Numerical Literacy"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary[200],
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.blueAccent[500],
                },
              }}
            >
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
            {errors.numericalLiteracy && (
              <FormHelperText>{errors.numericalLiteracy}</FormHelperText>
            )}
          </FormControl>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              marginTop: 3,
              marginBottom: 2,
              backgroundColor: colors.greenAccent[600],
              color: colors.gray[100],
              fontSize: 16,
              fontWeight: 600,
              padding: '12px',
              '&:hover': {
                backgroundColor: colors.greenAccent[700],
              },
            }}
          >
            Sign Up
          </Button>

          <Box sx={{ textAlign: 'center', marginTop: 2 }}>
            <Typography variant="body2" color={colors.gray[300]}>
              Already have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={() => navigate('/login')}
                sx={{
                  color: colors.blueAccent[500],
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default SignUp;
