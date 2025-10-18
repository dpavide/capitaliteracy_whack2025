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
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../theme';
import { supabase } from '../../lib/supabaseClient';

const USERS_TABLE = 'users';
// IMPORTANT: set this to your exact column name in DB
const NUMERICAL_LITERACY_COLUMN = 'numerical_literacy_level';

// Compute age in full years from a YYYY-MM-DD date string
function calculateAge(dobStr) {
  if (!dobStr) return NaN;
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return NaN;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const SignUp = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '', // replaced age with dob
    creditScore: '',
    numericalLiteracy: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
      newErrors.fullName = '"Full Name" is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = '"Email" is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = '"Password" is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '"Confirm Password" is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // DOB validation (must produce age between 13–120)
    const ageFromDob = calculateAge(formData.dob);
    if (!formData.dob) {
      newErrors.dob = '"Date of Birth" is required';
    } else if (Number.isNaN(ageFromDob)) {
      newErrors.dob = 'Please enter a valid date of birth';
    } else if (ageFromDob < 13 || ageFromDob > 120) {
      newErrors.dob = 'Age must be between 13 and 120';
      if (ageFromDob < 13) {
        newErrors.dobUnderage = 'you are not old enough to use this app';
      }
    }

    // Credit Score validation (only if age >= 18 and field is shown)
    if (!Number.isNaN(ageFromDob) && ageFromDob >= 18) {
      if (formData.creditScore === '') {
        newErrors.creditScore = '"Credit Score" is required';
      } else {
        const scoreNum = parseInt(formData.creditScore, 10);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 999) {
          newErrors.creditScore = 'Credit score must be between 0 and 999';
        }
      }
    }

    // Numerical Literacy validation (ensure matches DB constraint)
    if (!formData.numericalLiteracy) {
      newErrors.numericalLiteracy = '"Numerical Literacy" is required';
    } else if (!['beginner', 'intermediate', 'advanced'].includes(formData.numericalLiteracy)) {
      newErrors.numericalLiteracy = 'Numerical literacy must be beginner, intermediate, or advanced';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ageFromDob = calculateAge(formData.dob);

    // Under-13 hard block with banner message
    if (!formData.dob || Number.isNaN(ageFromDob) || ageFromDob < 13) {
      setErrors((prev) => ({
        ...prev,
        dob: !formData.dob
          ? '"Date of Birth" is required'
          : Number.isNaN(ageFromDob)
          ? 'Please enter a valid date of birth'
          : 'Age must be between 13 and 120',
        dobUnderage: 'you are not old enough to use this app',
      }));
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      const { email, password } = formData;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        alert(signUpError.message);
        setLoading(false);
        return;
      }

      const userId = signUpData?.user?.id || null;

      const payload = {
        id: userId,
        email: formData.email,
        full_name: formData.fullName,
        age: ageFromDob,
        [NUMERICAL_LITERACY_COLUMN]: formData.numericalLiteracy,
        credit_score: ageFromDob >= 18 ? (formData.creditScore === '' ? null : Number(formData.creditScore)) : null,
      };

      const session = signUpData?.session ?? (await supabase.auth.getSession()).data.session;
      if (!session) {
        localStorage.setItem('pendingProfile', JSON.stringify(payload));
        alert('Please verify your email, then sign in to finish creating your profile.');
        setLoading(false);
        navigate('/login');
        return;
      }

      const { data: upserted, error: upsertErr } = await supabase
        .from(USERS_TABLE)
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (upsertErr) {
        const msg = String(upsertErr.message || '');
        if ((upsertErr.status ?? 0) === 403 || msg.toLowerCase().includes('row-level security')) {
          alert('Profile insert blocked by RLS. Add an INSERT policy on "users": WITH CHECK (auth.uid() = id)');
        } else {
          alert(msg);
        }
        setLoading(false);
        return;
      }

      if (!upserted?.id) {
        console.warn('Upsert returned no row. Check RLS or schema.');
      }

      alert('Sign up successful!');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ageNum = calculateAge(formData.dob);

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

          {/* Underage banner directly above DOB field */}
          {errors.dobUnderage && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {errors.dobUnderage}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, marginTop: 2 }}>
            {/* Replace numeric Age with DOB date field */}
            <TextField
              fullWidth
              label="Date of Birth"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              error={!!errors.dob}
              helperText={errors.dob}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.primary[200] },
                  '&:hover fieldset': { borderColor: colors.blueAccent[500] },
                },
              }}
            />

            {Number.isFinite(ageNum) && ageNum >= 18 && (
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
                    '& fieldset': { borderColor: colors.primary[200] },
                    '&:hover fieldset': { borderColor: colors.blueAccent[500] },
                  },
                }}
              />
            )}
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
              <MenuItem value="beginner">Beginner</MenuItem>
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
            disabled={loading}
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
            {loading ? 'Signing Up...' : 'Sign Up'}
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
