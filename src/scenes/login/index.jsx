  import React, { useState } from 'react';
  import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Link,
    useTheme,
    Alert,
  } from '@mui/material';
  import { useNavigate } from 'react-router-dom';
  import { tokens } from '../../theme';
  import { supabase } from '../../lib/supabaseClient';

  const USERS_TABLE = 'users';
  // IMPORTANT: set this to the exact column name in your DB (must match signup)
  const NUMERICAL_LITERACY_COLUMN = 'numerical_literacy_level';

  const Login = () => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
      email: '',
      password: '',
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [infoMsg, setInfoMsg] = useState('');
    const [resending, setResending] = useState(false);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      // Clear field error and any auth-level messages when user types
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
      if (authError) setAuthError('');
      if (infoMsg) setInfoMsg('');
    };

    const validateForm = () => {
      const newErrors = {};

      if (!formData.email) {
        newErrors.email = '"Email" is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }

      if (!formData.password) {
        newErrors.password = '"Password" is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      try {
        setLoading(true);
        setAuthError('');
        setInfoMsg('');

        const emailTrimmed = formData.email.trim();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password: formData.password,
        });
        if (error) {
          const msg = String(error.message || '');
          // Common Supabase error when email is not confirmed
          if (msg.toLowerCase().includes('confirm')) {
            setAuthError('Please verify your email before signing in. You can resend the verification email below.');
          } else {
            setAuthError(msg || 'Unable to sign in. Please try again.');
          }
          setLoading(false);
          return;
        }

        const user = data.user;

        // Fetch profile (explicit 403 handling)
        let profile = null;
        const { data: p, error: profileErr } = await supabase
          .from(USERS_TABLE)
          .select('id, age')
          .eq('id', user.id)
          .maybeSingle();

        if (profileErr) {
          if ((profileErr.status ?? 0) === 403) {
            setAuthError('Profile read blocked by RLS. Add a SELECT policy on "users": USING (auth.uid() = id)');
            setLoading(false);
            return;
          }
          console.warn(profileErr.message);
        }
        profile = p ?? null;

        // If profile missing but we have a pendingProfile, try to insert now (session is present)
        const pendingRaw = localStorage.getItem('pendingProfile');
        if (!profile && pendingRaw) {
          try {
            const pending = JSON.parse(pendingRaw);
            if (pending?.id === user.id && pending.hasOwnProperty(NUMERICAL_LITERACY_COLUMN)) {
              const { error: insertErr } = await supabase
                .from(USERS_TABLE)
                .upsert(pending, { onConflict: 'id' });

              if (!insertErr) {
                localStorage.removeItem('pendingProfile');
                profile = pending;
              } else {
                const imsg = String(insertErr.message || '');
                if ((insertErr.status ?? 0) === 403 || imsg.toLowerCase().includes('row-level security')) {
                  setAuthError('Profile insert blocked by RLS. Add an INSERT policy on "users": WITH CHECK (auth.uid() = id)');
                } else {
                  setAuthError(`Profile save failed: ${imsg}`);
                }
                setLoading(false);
                return;
              }
            }
          } catch {
            // ignore JSON parse issues
          }
        } else if (pendingRaw && profile) {
          localStorage.removeItem('pendingProfile');
        }

        const ageNum = profile?.age ?? null;
        if (typeof ageNum === 'number' && ageNum < 13) {
          await supabase.auth.signOut();
          setAuthError('You must be at least 13 years old');
          setLoading(false);
          return;
        }

        // Navigate to upload page after successful authentication
        navigate('/upload');
      } catch (err) {
        console.error(err);
        setAuthError('Unexpected error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const handleResendVerification = async () => {
      try {
        setResending(true);
        setInfoMsg('');
        setAuthError('');
        const emailTrimmed = formData.email.trim();
        if (!emailTrimmed) {
          setErrors((prev) => ({ ...prev, email: '"Email" is required' }));
          return;
        }
        const { error } = await supabase.auth.resend({ type: 'signup', email: emailTrimmed });
        if (error) {
          setAuthError(error.message || 'Could not resend verification email.');
          return;
        }
        setInfoMsg('Verification email sent. Please check your inbox.');
      } catch (e) {
        setAuthError('Could not resend verification email. Please try again later.');
      } finally {
        setResending(false);
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
            {/* Top-level auth messages */}
            {authError && (
              <Alert severity="error" sx={{ mb: 2 }}>{authError}</Alert>
            )}
            {infoMsg && (
              <Alert severity="success" sx={{ mb: 2 }}>{infoMsg}</Alert>
            )}

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
              disabled={loading}
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
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            {/* Resend verification action shown when relevant */}
            {authError?.toLowerCase().includes('verify your email') && (
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Button size="small" onClick={handleResendVerification} disabled={resending}>
                  {resending ? 'Resending…' : 'Resend verification email'}
                </Button>
              </Box>
            )}

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
