import {
  formatRelativeTime,
  formatAbsoluteTime,
  getTimeDisplay,
  isVeryRecent,
  isVeryOld
} from '../../../src/utils/timeUtils';

// Mock date-fns functions for consistent testing
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(),
  format: jest.fn(),
  isValid: jest.fn(),
  parseISO: jest.fn()
}));

import { formatDistanceToNow, format, isValid, parseISO } from 'date-fns';

const mockFormatDistanceToNow = formatDistanceToNow as jest.MockedFunction<typeof formatDistanceToNow>;
const mockFormat = format as jest.MockedFunction<typeof format>;
const mockIsValid = isValid as jest.MockedFunction<typeof isValid>;
const mockParseISO = parseISO as jest.MockedFunction<typeof parseISO>;

describe('timeUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatRelativeTime', () => {
    it('should format valid date string to relative time', () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(true);
      mockFormatDistanceToNow.mockReturnValue('2 hours ago');

      const result = formatRelativeTime('2023-01-01T12:00:00Z');

      expect(result).toBe('2 hours ago');
      expect(mockParseISO).toHaveBeenCalledWith('2023-01-01T12:00:00Z');
      expect(mockIsValid).toHaveBeenCalledWith(testDate);
      expect(mockFormatDistanceToNow).toHaveBeenCalledWith(testDate, { addSuffix: true });
    });

    it('should return "Unknown" for empty string', () => {
      const result = formatRelativeTime('');
      expect(result).toBe('Unknown');
    });

    it('should return "Invalid date" for invalid date', () => {
      const testDate = new Date('invalid');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(false);

      const result = formatRelativeTime('invalid-date');

      expect(result).toBe('Invalid date');
    });

    it('should handle parsing errors', () => {
      mockParseISO.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = formatRelativeTime('invalid-date');

      expect(result).toBe('Invalid date');
    });
  });

  describe('formatAbsoluteTime', () => {
    it('should format valid date string to absolute time', () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(true);
      mockFormat.mockReturnValue('Jan 1, 2023 at 12:00 PM');

      const result = formatAbsoluteTime('2023-01-01T12:00:00Z');

      expect(result).toBe('Jan 1, 2023 at 12:00 PM');
      expect(mockParseISO).toHaveBeenCalledWith('2023-01-01T12:00:00Z');
      expect(mockIsValid).toHaveBeenCalledWith(testDate);
      expect(mockFormat).toHaveBeenCalledWith(testDate, 'PPpp');
    });

    it('should return "Unknown" for empty string', () => {
      const result = formatAbsoluteTime('');
      expect(result).toBe('Unknown');
    });

    it('should return "Invalid date" for invalid date', () => {
      const testDate = new Date('invalid');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(false);

      const result = formatAbsoluteTime('invalid-date');

      expect(result).toBe('Invalid date');
    });

    it('should handle parsing errors', () => {
      mockParseISO.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = formatAbsoluteTime('invalid-date');

      expect(result).toBe('Invalid date');
    });
  });

  describe('getTimeDisplay', () => {
    it('should return both relative and absolute time', () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(true);
      mockFormatDistanceToNow.mockReturnValue('2 hours ago');
      mockFormat.mockReturnValue('Jan 1, 2023 at 12:00 PM');

      const result = getTimeDisplay('2023-01-01T12:00:00Z');

      expect(result).toEqual({
        relative: '2 hours ago',
        absolute: 'Jan 1, 2023 at 12:00 PM'
      });
    });

    it('should handle invalid dates for both formats', () => {
      const result = getTimeDisplay('');

      expect(result).toEqual({
        relative: 'Unknown',
        absolute: 'Unknown'
      });
    });
  });

  describe('isVeryRecent', () => {
    beforeEach(() => {
      // Mock current time to a fixed date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T12:01:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for date less than 1 minute ago', () => {
      const recentDate = new Date('2023-01-01T12:00:30Z'); // 30 seconds ago
      mockParseISO.mockReturnValue(recentDate);
      mockIsValid.mockReturnValue(true);

      const result = isVeryRecent('2023-01-01T12:00:30Z');

      expect(result).toBe(true);
    });

    it('should return false for date more than 1 minute ago', () => {
      const oldDate = new Date('2023-01-01T11:59:00Z'); // 2 minutes ago
      mockParseISO.mockReturnValue(oldDate);
      mockIsValid.mockReturnValue(true);

      const result = isVeryRecent('2023-01-01T11:59:00Z');

      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = isVeryRecent('');
      expect(result).toBe(false);
    });

    it('should return false for invalid date', () => {
      const testDate = new Date('invalid');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(false);

      const result = isVeryRecent('invalid-date');

      expect(result).toBe(false);
    });

    it('should handle parsing errors', () => {
      mockParseISO.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = isVeryRecent('invalid-date');

      expect(result).toBe(false);
    });
  });

  describe('isVeryOld', () => {
    beforeEach(() => {
      // Mock current time to a fixed date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for date more than 1 year ago', () => {
      const oldDate = new Date('2022-12-01T12:00:00Z'); // More than 1 year ago
      mockParseISO.mockReturnValue(oldDate);
      mockIsValid.mockReturnValue(true);

      const result = isVeryOld('2022-12-01T12:00:00Z');

      expect(result).toBe(true);
    });

    it('should return false for date less than 1 year ago', () => {
      const recentDate = new Date('2023-06-01T12:00:00Z'); // 7 months ago
      mockParseISO.mockReturnValue(recentDate);
      mockIsValid.mockReturnValue(true);

      const result = isVeryOld('2023-06-01T12:00:00Z');

      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = isVeryOld('');
      expect(result).toBe(false);
    });

    it('should return false for invalid date', () => {
      const testDate = new Date('invalid');
      mockParseISO.mockReturnValue(testDate);
      mockIsValid.mockReturnValue(false);

      const result = isVeryOld('invalid-date');

      expect(result).toBe(false);
    });

    it('should handle parsing errors', () => {
      mockParseISO.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = isVeryOld('invalid-date');

      expect(result).toBe(false);
    });
  });
});