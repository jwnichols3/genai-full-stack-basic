import { createTheme, ThemeOptions } from '@mui/material/styles';

// AWS Color Palette
const awsColors = {
  primary: {
    main: '#232F3E', // AWS Dark Blue
    light: '#37475A',
    dark: '#161E2D',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FF9900', // AWS Orange
    light: '#FFB84D',
    dark: '#CC7A00',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F2F3F3',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#232F3E',
    secondary: '#545B64',
  },
  grey: {
    50: '#FAFBFC',
    100: '#F2F3F3',
    200: '#EAEDED',
    300: '#D5DBDB',
    400: '#AAB7B8',
    500: '#85929E',
    600: '#5A6C7D',
    700: '#425A68',
    800: '#2E4057',
    900: '#1B2631',
  },
  success: {
    main: '#1B660F',
    light: '#2E8B57',
    dark: '#0D4F0A',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#FF9900',
    light: '#FFB84D',
    dark: '#CC7A00',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#D13212',
    light: '#FF6B47',
    dark: '#A02A0F',
    contrastText: '#FFFFFF',
  },
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: awsColors.primary,
    secondary: awsColors.secondary,
    background: awsColors.background,
    text: awsColors.text,
    grey: awsColors.grey,
    success: awsColors.success,
    warning: awsColors.warning,
    error: awsColors.error,
  },
  typography: {
    fontFamily: '"Amazon Ember", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 300,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: awsColors.primary.main,
          color: awsColors.primary.contrastText,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0,0,0,0.12)',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: awsColors.background.default,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
};

export const theme = createTheme(themeOptions);

// Dark theme variant for future use
export const darkTheme = createTheme({
  ...themeOptions,
  palette: {
    ...themeOptions.palette,
    mode: 'dark',
    background: {
      default: '#1B2631',
      paper: '#2E4057',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#D5DBDB',
    },
  },
});
