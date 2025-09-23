import { formatDistanceToNow, format, isValid, parseISO } from 'date-fns';

/**
 * Format a date string to relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - ISO date string
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'Unknown';

  try {
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return 'Invalid date';
    }

    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format a date string to absolute time with timezone
 * @param dateString - ISO date string
 * @returns Formatted absolute time string
 */
export const formatAbsoluteTime = (dateString: string): string => {
  if (!dateString) return 'Unknown';

  try {
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return 'Invalid date';
    }

    return format(date, 'PPpp'); // e.g., "Apr 29, 2023 at 11:30 AM"
  } catch {
    return 'Invalid date';
  }
};

/**
 * Get a human-readable time duration from now
 * @param dateString - ISO date string
 * @returns Object with relative and absolute time
 */
export const getTimeDisplay = (dateString: string): {
  relative: string;
  absolute: string;
} => {
  return {
    relative: formatRelativeTime(dateString),
    absolute: formatAbsoluteTime(dateString),
  };
};

/**
 * Check if a date is very recent (less than 1 minute ago)
 * @param dateString - ISO date string
 * @returns True if date is very recent
 */
export const isVeryRecent = (dateString: string): boolean => {
  if (!dateString) return false;

  try {
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return false;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs < 60000; // Less than 1 minute
  } catch {
    return false;
  }
};

/**
 * Check if a date is very old (more than 1 year ago)
 * @param dateString - ISO date string
 * @returns True if date is very old
 */
export const isVeryOld = (dateString: string): boolean => {
  if (!dateString) return false;

  try {
    const date = parseISO(dateString);

    if (!isValid(date)) {
      return false;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs > 365 * 24 * 60 * 60 * 1000; // More than 1 year
  } catch {
    return false;
  }
};