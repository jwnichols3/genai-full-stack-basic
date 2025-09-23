// Login form component with Material-UI components and validation
import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import type { LoginCredentials } from '../../types/auth';

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginForm({ onSubmit, loading = false, error }: LoginFormProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'password is required';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    errors.email = validateEmail(formData.email);
    errors.password = validatePassword(formData.password);

    setFormErrors(errors);

    return !errors.email && !errors.password;
  };

  const handleInputChange =
    (field: keyof LoginCredentials) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear field error when user starts typing
      if (formErrors[field]) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm() || isSubmitting || loading) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loading || isSubmitting;

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      padding={2}
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
      }}
    >
      <Card
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ padding: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" marginBottom={3}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: theme.palette.primary.main,
                marginBottom: 2,
              }}
            >
              <LockIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>

            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              component="h1"
              gutterBottom
              textAlign="center"
              fontWeight="bold"
            >
              EC2 Manager
            </Typography>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Enter your credentials to access the EC2 Instance Manager
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }} variant="outlined">
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            noValidate
          >
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email}
              disabled={isLoading}
              autoComplete="email"
              margin="normal"
              variant="outlined"
              sx={{ marginBottom: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={isLoading}
              autoComplete="current-password"
              margin="normal"
              variant="outlined"
              sx={{ marginBottom: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                marginBottom: 2,
                padding: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
              }}
            >
              {isLoading ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} color="inherit" />
                  <span>Signing In...</span>
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
