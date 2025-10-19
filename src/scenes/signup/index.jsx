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
  Slider,
  InputAdornment,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../../theme';
import { supabase } from '../../lib/supabaseClient';

const USERS_TABLE = 'users';
const PROFILES_TABLE = 'profiles'; // Define the profiles table name
const NUMERICAL_LITERACY_COLUMN = 'numerical_literacy_level';

// Helper function to calculate age from a date string (YYYY-MM-DD)
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
    dob: '',
    creditScore: '',
    numericalLiteracy: '',
    annual_income: '',
    primary_goal: '',
    primary_goal_other: '',
    is_first_time_buyer: null,
    target_home_price: 250000,
    down_payment: 25000,
    buying_timeline: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSliderChange = (name) => (event, newValue) => {
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const validateForm = () => {
    const newErrors = {};
    const ageFromDob = calculateAge(formData.dob);

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.dob) newErrors.dob = 'Date of Birth is required';
    else if (ageFromDob < 13) newErrors.dobUnderage = 'You must be at least 13 years old to sign up.';
    if (!formData.numericalLiteracy) newErrors.numericalLiteracy = 'Numerical Literacy is required';

    if (ageFromDob >= 18) {
      if (formData.creditScore === '') newErrors.creditScore = 'Credit Score is required';
      else if (parseInt(formData.creditScore, 10) < 300 || parseInt(formData.creditScore, 10) > 850) {
        newErrors.creditScore = 'Credit score must be between 300 and 850';
      }
    }

    if (!formData.annual_income) {
      newErrors.annual_income = 'Annual Income is required';
    } else if (isNaN(Number(formData.annual_income)) || Number(formData.annual_income) <= 0) {
      newErrors.annual_income = 'Please enter a valid income amount';
    }

    if (!formData.primary_goal) {
      newErrors.primary_goal = 'Primary Goal is required';
    } else if (formData.primary_goal === 'other' && !formData.primary_goal_other.trim()) {
      newErrors.primary_goal_other = 'Please specify your goal';
    }

    if (formData.primary_goal === 'buy_home') {
      if (formData.is_first_time_buyer === null) newErrors.is_first_time_buyer = 'This field is required';
      if (!formData.buying_timeline) newErrors.buying_timeline = 'Buying Timeline is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { email, password } = formData;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        alert(signUpError.message);
        setLoading(false);
        return;
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        alert('Sign-up succeeded but could not get user ID. Please verify your email and log in.');
        navigate('/login');
        return;
      }

      const ageFromDob = calculateAge(formData.dob);

      // --- FIXED LOGIC ---
      // Payload for the 'users' table (core user info)
      const userPayload = {
        id: userId,
        full_name: formData.fullName,
        email: formData.email,
        age: ageFromDob,
        credit_score: ageFromDob >= 18 ? Number(formData.creditScore) : null,
        [NUMERICAL_LITERACY_COLUMN]: formData.numericalLiteracy,
      };

      // Payload for the 'profiles' table (questionnaire info)
      const profilePayload = {
        id: userId,
        annual_income: Number(formData.annual_income),
        primary_goal: formData.primary_goal === 'other' ? formData.primary_goal_other : formData.primary_goal,
        is_first_time_buyer: formData.primary_goal === 'buy_home' ? formData.is_first_time_buyer : null,
        target_home_price: formData.primary_goal === 'buy_home' ? formData.target_home_price : null,
        down_payment: formData.primary_goal === 'buy_home' ? formData.down_payment : null,
        buying_timeline: formData.primary_goal === 'buy_home' ? formData.buying_timeline : null,
      };

      // Perform both database operations concurrently
      const [userResult, profileResult] = await Promise.all([
        supabase.from(USERS_TABLE).upsert(userPayload),
        supabase.from(PROFILES_TABLE).upsert(profilePayload)
      ]);

      // Check for errors from either operation
      if (userResult.error || profileResult.error) {
        const userError = userResult.error ? `Users table error: ${userResult.error.message}` : '';
        const profileError = profileResult.error ? `Profiles table error: ${profileResult.error.message}` : '';
        alert(`Error saving profile data.\n${userError}\n${profileError}`);
        setLoading(false);
        return;
      }

      alert('Sign up successful! Please check your email for a verification link, then log in.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ageNum = calculateAge(formData.dob);

  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.primary[400], padding: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4, maxWidth: 500, width: '100%',
          backgroundColor: colors.primary[400], borderRadius: 2,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, textAlign: 'center', color: colors.gray[100], mb: 2 }}>
          Create Account
        </Typography>
        <Typography variant="body1" sx={{ textAlign: 'center', color: colors.gray[300], mb: 3 }}>
          Sign up to get started
        </Typography>

        <form onSubmit={handleSubmit} noValidate>
          {/* --- Basic Info Fields --- */}
          <TextField fullWidth label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} error={!!errors.fullName} helperText={errors.fullName} margin="normal" />
          <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={!!errors.email} helperText={errors.email} margin="normal" />
          <TextField fullWidth label="Password" name="password" type="password" value={formData.password} onChange={handleChange} error={!!errors.password} helperText={errors.password} margin="normal" />
          <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} error={!!errors.confirmPassword} helperText={errors.confirmPassword} margin="normal" />
          {errors.dobUnderage && <Alert severity="error" sx={{ mb: 1 }}>{errors.dobUnderage}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField fullWidth label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} error={!!errors.dob} helperText={errors.dob} InputLabelProps={{ shrink: true }} />
            {ageNum >= 18 && (
              <TextField fullWidth label="Credit Score (300-850)" name="creditScore" type="number" value={formData.creditScore} onChange={handleChange} error={!!errors.creditScore} helperText={errors.creditScore} />
            )}
          </Box>
          <FormControl fullWidth margin="normal" error={!!errors.numericalLiteracy}>
            <InputLabel>Numerical Literacy</InputLabel>
            <Select name="numericalLiteracy" value={formData.numericalLiteracy} label="Numerical Literacy" onChange={handleChange}>
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
            <FormHelperText>{errors.numericalLiteracy}</FormHelperText>
          </FormControl>

          {/* --- Questionnaire Section --- */}
          <Typography variant="h5" sx={{ mt: 4, mb: 1, color: colors.gray[100], borderTop: `1px solid ${colors.primary[300]}`, pt: 2 }}>
            Tell Us About Your Goals
          </Typography>
          <FormControl fullWidth margin="normal" error={!!errors.primary_goal}>
            <InputLabel>Primary Goal</InputLabel>
            <Select name="primary_goal" value={formData.primary_goal} label="Primary Goal" onChange={handleChange}>
              <MenuItem value="buy_home">Buy a home</MenuItem>
              <MenuItem value="buy_car">Buy a car</MenuItem>
              <MenuItem value="refinance">Refinance a loan</MenuItem>
              <MenuItem value="build_credit">Build my credit</MenuItem>
              <MenuItem value="monitor">Monitor my financial health</MenuItem>
              <MenuItem value="other">Other (Please specify)</MenuItem>
            </Select>
            <FormHelperText>{errors.primary_goal}</FormHelperText>
          </FormControl>

          {formData.primary_goal === 'other' && (
            <TextField
              fullWidth
              label="Your Primary Goal"
              name="primary_goal_other"
              value={formData.primary_goal_other}
              onChange={handleChange}
              error={!!errors.primary_goal_other}
              helperText={errors.primary_goal_other}
              margin="normal"
            />
          )}

          <TextField
            fullWidth
            label="Annual Household Income"
            name="annual_income"
            type="number"
            value={formData.annual_income}
            onChange={handleChange}
            error={!!errors.annual_income}
            helperText={errors.annual_income}
            margin="normal"
            InputProps={{
              startAdornment: <InputAdornment position="start">£</InputAdornment>,
            }}
          />

          {/* Conditional Fields for Home Buyers */}
          {formData.primary_goal === 'buy_home' && (
            <Box sx={{ mt: 2, p: 2, border: `1px solid ${colors.primary[300]}`, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, color: colors.gray[200] }}>Home Buyer Details</Typography>
              <FormControl fullWidth margin="normal" error={!!errors.is_first_time_buyer}>
                <InputLabel>Are you a first-time home buyer?</InputLabel>
                <Select name="is_first_time_buyer" value={formData.is_first_time_buyer} label="Are you a first-time home buyer?" onChange={handleChange}>
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
                <FormHelperText>{errors.is_first_time_buyer}</FormHelperText>
              </FormControl>
              <FormControl fullWidth margin="normal" error={!!errors.buying_timeline}>
                <InputLabel>Buying Timeline</InputLabel>
                <Select name="buying_timeline" value={formData.buying_timeline} label="Buying Timeline" onChange={handleChange}>
                  <MenuItem value="<6m">Within 6 months</MenuItem>
                  <MenuItem value="6-12m">6 - 12 months</MenuItem>
                  <MenuItem value="1-2y">1 - 2 years</MenuItem>
                  <MenuItem value="2y+">More than 2 years</MenuItem>
                </Select>
                <FormHelperText>{errors.buying_timeline}</FormHelperText>
              </FormControl>
              <Typography gutterBottom sx={{ mt: 2 }}>Target Home Price: £{formData.target_home_price.toLocaleString()}</Typography>
              <Slider value={formData.target_home_price} onChange={handleSliderChange('target_home_price')} valueLabelDisplay="auto" step={10000} min={50000} max={1500000} />
              <Typography gutterBottom sx={{ mt: 2 }}>Down Payment: £{formData.down_payment.toLocaleString()}</Typography>
              <Slider value={formData.down_payment} onChange={handleSliderChange('down_payment')} valueLabelDisplay="auto" step={1000} min={0} max={200000} />
            </Box>
          )}

          <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2, backgroundColor: colors.greenAccent[600], color: colors.gray[100], fontSize: 16, fontWeight: 600, padding: '12px', '&:hover': { backgroundColor: colors.greenAccent[700] } }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color={colors.gray[300]}>
              Already have an account?{' '}
              <Link component="button" type="button" onClick={() => navigate('/login')} sx={{ color: colors.blueAccent[500], textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
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

