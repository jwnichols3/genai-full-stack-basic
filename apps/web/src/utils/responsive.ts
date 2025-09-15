import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

// Custom hook for responsive breakpoints
export const useResponsive = () => {
  const theme = useTheme();

  return {
    isMobile: useMediaQuery(theme.breakpoints.down('sm')),
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'md')),
    isDesktop: useMediaQuery(theme.breakpoints.up('md')),
    isLargeDesktop: useMediaQuery(theme.breakpoints.up('lg')),
    isExtraLarge: useMediaQuery(theme.breakpoints.up('xl')),
  };
};

// Responsive container styles helper
export const getResponsiveContainerStyles = () => ({
  maxWidth: {
    xs: '100%',
    sm: '600px',
    md: '900px',
    lg: '1200px',
    xl: '1536px',
  },
  px: { xs: 2, sm: 3, md: 4 },
  py: { xs: 2, sm: 3, md: 4 },
});

// Responsive typography helper
export const getResponsiveTypographyStyles = () => ({
  h1: {
    fontSize: {
      xs: '2rem',
      sm: '2.5rem',
      md: '3rem',
      lg: '3.5rem',
    },
  },
  h2: {
    fontSize: {
      xs: '1.75rem',
      sm: '2rem',
      md: '2.25rem',
      lg: '2.5rem',
    },
  },
  h3: {
    fontSize: {
      xs: '1.5rem',
      sm: '1.75rem',
      md: '2rem',
    },
  },
  h4: {
    fontSize: {
      xs: '1.25rem',
      sm: '1.5rem',
      md: '1.75rem',
    },
  },
  body1: {
    fontSize: {
      xs: '0.875rem',
      sm: '1rem',
    },
  },
});

// Responsive spacing helpers
export const getResponsiveSpacing = (baseSpacing: number) => ({
  xs: baseSpacing * 0.5,
  sm: baseSpacing * 0.75,
  md: baseSpacing,
  lg: baseSpacing * 1.25,
  xl: baseSpacing * 1.5,
});

// Grid layout helpers for responsive columns
export const getResponsiveGridColumns = () => ({
  xs: 12,
  sm: 6,
  md: 4,
  lg: 3,
  xl: 2,
});

// Card layout helpers
export const getResponsiveCardStyles = () => ({
  width: {
    xs: '100%',
    sm: 'calc(50% - 8px)',
    md: 'calc(33.333% - 8px)',
    lg: 'calc(25% - 8px)',
  },
  minHeight: {
    xs: 200,
    sm: 220,
    md: 240,
  },
});

export default {
  useResponsive,
  getResponsiveContainerStyles,
  getResponsiveTypographyStyles,
  getResponsiveSpacing,
  getResponsiveGridColumns,
  getResponsiveCardStyles,
};
