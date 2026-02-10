import {
  parseDurationString,
  formatDurationString,
  parseISO8601Duration,
  formatTimeShort,
} from '@/lib/utils/durationParser';

describe('parseDurationString', () => {
  describe('valid HH:MM:SS formats', () => {
    it('should parse full timestamp with hours', () => {
      expect(parseDurationString('1:30:45')).toBe(5445);
    });

    it('should parse timestamp with zero hours', () => {
      expect(parseDurationString('0:05:30')).toBe(330);
    });

    it('should parse MM:SS format (no hours)', () => {
      expect(parseDurationString('5:30')).toBe(330);
    });

    it('should parse zero duration', () => {
      expect(parseDurationString('0:00:00')).toBe(0);
      expect(parseDurationString('0:00')).toBe(0);
    });

    it('should parse single digit components', () => {
      expect(parseDurationString('1:2:3')).toBe(3723);
    });

    it('should parse padded components', () => {
      expect(parseDurationString('01:05:03')).toBe(3903);
    });

    it('should parse long durations', () => {
      expect(parseDurationString('100:30:15')).toBe(361815);
      expect(parseDurationString('999:59:59')).toBe(3599999);
    });

    it('should parse maximum valid minutes and seconds', () => {
      expect(parseDurationString('1:59:59')).toBe(7199);
    });
  });

  describe('invalid formats', () => {
    it('should return null for empty string', () => {
      expect(parseDurationString('')).toBeNull();
    });

    it('should return null for whitespace only', () => {
      expect(parseDurationString('   ')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(parseDurationString(null as any)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(parseDurationString(undefined as any)).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(parseDurationString(123 as any)).toBeNull();
    });

    it('should return null for too few parts', () => {
      expect(parseDurationString('30')).toBeNull();
    });

    it('should return null for too many parts', () => {
      expect(parseDurationString('1:2:3:4')).toBeNull();
    });

    it('should return null for non-numeric parts', () => {
      expect(parseDurationString('1:abc:30')).toBeNull();
      expect(parseDurationString('abc:30')).toBeNull();
      expect(parseDurationString('1:30:xyz')).toBeNull();
    });

    it('should return null for seconds out of range', () => {
      expect(parseDurationString('1:30:60')).toBeNull();
      expect(parseDurationString('1:30:75')).toBeNull();
      expect(parseDurationString('0:60')).toBeNull();
    });

    it('should return null for minutes out of range', () => {
      expect(parseDurationString('1:60:30')).toBeNull();
      expect(parseDurationString('1:75:00')).toBeNull();
      expect(parseDurationString('60:30')).toBeNull();
    });

    it('should return null for negative values', () => {
      expect(parseDurationString('-1:30:00')).toBeNull();
      expect(parseDurationString('1:-30:00')).toBeNull();
      expect(parseDurationString('1:30:-15')).toBeNull();
    });

    it('should return null for decimal values', () => {
      expect(parseDurationString('1.5:30:00')).toBeNull();
      expect(parseDurationString('1:30.5:00')).toBeNull();
    });

    it('should return null for partial timestamps', () => {
      expect(parseDurationString('1:')).toBeNull();
      expect(parseDurationString(':30')).toBeNull();
      expect(parseDurationString('::30')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle strings with leading/trailing whitespace', () => {
      expect(parseDurationString('  1:30:45  ')).toBe(5445);
    });

    it('should parse minimum valid duration', () => {
      expect(parseDurationString('0:0:0')).toBe(0);
    });

    it('should parse duration with max minutes and seconds', () => {
      expect(parseDurationString('0:59:59')).toBe(3599);
    });
  });
});

describe('formatDurationString', () => {
  describe('valid formatting', () => {
    it('should format standard duration', () => {
      expect(formatDurationString(5445)).toBe('1:30:45');
    });

    it('should format zero duration', () => {
      expect(formatDurationString(0)).toBe('0:00:00');
    });

    it('should format duration less than 1 hour', () => {
      expect(formatDurationString(330)).toBe('0:05:30');
    });

    it('should format duration less than 1 minute', () => {
      expect(formatDurationString(45)).toBe('0:00:45');
    });

    it('should format long duration', () => {
      expect(formatDurationString(360000)).toBe('100:00:00');
      expect(formatDurationString(3599999)).toBe('999:59:59');
    });

    it('should pad minutes and seconds with zeros', () => {
      expect(formatDurationString(3723)).toBe('1:02:03');
      expect(formatDurationString(3)).toBe('0:00:03');
      expect(formatDurationString(60)).toBe('0:01:00');
    });

    it('should format maximum single-digit hours', () => {
      expect(formatDurationString(35999)).toBe('9:59:59');
    });
  });

  describe('error handling', () => {
    it('should throw error for negative duration', () => {
      expect(() => formatDurationString(-1)).toThrow('Duration cannot be negative');
      expect(() => formatDurationString(-100)).toThrow('Duration cannot be negative');
    });

    it('should throw error for infinite duration', () => {
      expect(() => formatDurationString(Infinity)).toThrow('Duration must be a finite number');
      expect(() => formatDurationString(-Infinity)).toThrow('Duration must be a finite number');
    });

    it('should throw error for NaN', () => {
      expect(() => formatDurationString(NaN)).toThrow('Duration must be a finite number');
    });
  });

  describe('edge cases', () => {
    it('should handle very small durations', () => {
      expect(formatDurationString(1)).toBe('0:00:01');
    });

    it('should handle exact hour boundaries', () => {
      expect(formatDurationString(3600)).toBe('1:00:00');
      expect(formatDurationString(7200)).toBe('2:00:00');
    });

    it('should handle exact minute boundaries', () => {
      expect(formatDurationString(60)).toBe('0:01:00');
      expect(formatDurationString(120)).toBe('0:02:00');
    });

    it('should handle fractional seconds by flooring', () => {
      expect(formatDurationString(330.9)).toBe('0:05:30');
      expect(formatDurationString(3723.7)).toBe('1:02:03');
    });
  });
});

describe('parseISO8601Duration', () => {
  describe('valid YouTube API formats', () => {
    it('should parse full duration with hours, minutes, seconds', () => {
      expect(parseISO8601Duration('PT1H23M45S')).toBe(5025);
      expect(parseISO8601Duration('PT6H5M15S')).toBe(21915);
    });

    it('should parse duration with only minutes and seconds', () => {
      expect(parseISO8601Duration('PT5M30S')).toBe(330);
      expect(parseISO8601Duration('PT15M45S')).toBe(945);
    });

    it('should parse duration with only seconds', () => {
      expect(parseISO8601Duration('PT15S')).toBe(15);
      expect(parseISO8601Duration('PT59S')).toBe(59);
    });

    it('should parse duration with only hours', () => {
      expect(parseISO8601Duration('PT2H')).toBe(7200);
      expect(parseISO8601Duration('PT1H')).toBe(3600);
    });

    it('should parse duration with only minutes', () => {
      expect(parseISO8601Duration('PT10M')).toBe(600);
      expect(parseISO8601Duration('PT45M')).toBe(2700);
    });

    it('should parse duration with hours and minutes', () => {
      expect(parseISO8601Duration('PT2H30M')).toBe(9000);
    });

    it('should parse duration with hours and seconds', () => {
      expect(parseISO8601Duration('PT1H15S')).toBe(3615);
    });

    it('should parse long durations', () => {
      expect(parseISO8601Duration('PT100H30M15S')).toBe(361815);
    });

    it('should parse multi-digit components', () => {
      expect(parseISO8601Duration('PT12H34M56S')).toBe(45296);
    });
  });

  describe('error handling', () => {
    it('should throw error for empty string', () => {
      expect(() => parseISO8601Duration('')).toThrow('must be a non-empty string');
    });

    it('should throw error for whitespace only', () => {
      expect(() => parseISO8601Duration('   ')).toThrow('must start with "PT"');
    });

    it('should throw error for null input', () => {
      expect(() => parseISO8601Duration(null as any)).toThrow('must be a non-empty string');
    });

    it('should throw error for undefined input', () => {
      expect(() => parseISO8601Duration(undefined as any)).toThrow('must be a non-empty string');
    });

    it('should throw error for non-string input', () => {
      expect(() => parseISO8601Duration(123 as any)).toThrow('must be a non-empty string');
    });

    it('should throw error for missing PT prefix', () => {
      expect(() => parseISO8601Duration('1H30M')).toThrow('must start with "PT"');
      expect(() => parseISO8601Duration('T1H30M')).toThrow('must start with "PT"');
      expect(() => parseISO8601Duration('P1H30M')).toThrow('must start with "PT"');
    });

    it('should throw error for PT only', () => {
      expect(() => parseISO8601Duration('PT')).toThrow('no duration specified');
    });

    it('should throw error for invalid format', () => {
      expect(() => parseISO8601Duration('PT')).toThrow('no duration specified');
      expect(() => parseISO8601Duration('PTABC')).toThrow('no valid time components');
      expect(() => parseISO8601Duration('PT1X2Y3Z')).toThrow('no valid time components');
    });

    it('should throw error for date components (not time)', () => {
      // ISO 8601 also supports date durations like P1Y2M3D, but YouTube only uses time
      expect(() => parseISO8601Duration('P1Y2M3D')).toThrow('must start with "PT"');
    });
  });

  describe('edge cases', () => {
    it('should handle strings with leading/trailing whitespace', () => {
      expect(parseISO8601Duration('  PT5M30S  ')).toBe(330);
    });

    it('should parse zero-like durations', () => {
      expect(parseISO8601Duration('PT0S')).toBe(0);
      expect(parseISO8601Duration('PT0H0M0S')).toBe(0);
    });

    it('should handle order independence', () => {
      // Technically ISO 8601 requires order (H before M before S)
      // but our regex-based parser is lenient
      expect(parseISO8601Duration('PT30M5H15S')).toBe(19815);
      expect(parseISO8601Duration('PT15S30M5H')).toBe(19815);
    });
  });
});

describe('formatTimeShort', () => {
  describe('basic seconds', () => {
    it('should format 0 seconds', () => {
      expect(formatTimeShort(0)).toBe('0:00');
    });

    it('should format single-digit seconds', () => {
      expect(formatTimeShort(5)).toBe('0:05');
    });

    it('should format 30 seconds', () => {
      expect(formatTimeShort(30)).toBe('0:30');
    });
  });

  describe('minutes', () => {
    it('should format exact minutes', () => {
      expect(formatTimeShort(60)).toBe('1:00');
    });

    it('should format minutes and seconds', () => {
      expect(formatTimeShort(90)).toBe('1:30');
    });

    it('should format multi-digit minutes', () => {
      expect(formatTimeShort(125)).toBe('2:05');
    });
  });

  describe('hours', () => {
    it('should format exact hours', () => {
      expect(formatTimeShort(3600)).toBe('1:00:00');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatTimeShort(3661)).toBe('1:01:01');
    });
  });

  describe('decimal seconds', () => {
    it('should floor decimal seconds', () => {
      expect(formatTimeShort(90.7)).toBe('1:30');
    });
  });
});

describe('roundtrip formatting', () => {
  it('should parse and format back to same value', () => {
    const testCases = [
      '0:00:00',
      '0:05:30',
      '1:30:45',
      '10:00:00',
      '100:59:59',
    ];

    testCases.forEach(input => {
      const seconds = parseDurationString(input);
      expect(seconds).not.toBeNull();
      const formatted = formatDurationString(seconds!);
      expect(formatted).toBe(input);
    });
  });

  it('should format and parse back to same seconds', () => {
    const testCases = [0, 45, 330, 5445, 360000];

    testCases.forEach(seconds => {
      const formatted = formatDurationString(seconds);
      const parsed = parseDurationString(formatted);
      expect(parsed).toBe(seconds);
    });
  });

  it('should convert ISO 8601 to HH:MM:SS and back', () => {
    const testCases = [
      { iso: 'PT15S', seconds: 15, formatted: '0:00:15' },
      { iso: 'PT5M30S', seconds: 330, formatted: '0:05:30' },
      { iso: 'PT1H23M45S', seconds: 5025, formatted: '1:23:45' },
      { iso: 'PT2H', seconds: 7200, formatted: '2:00:00' },
      { iso: 'PT10M', seconds: 600, formatted: '0:10:00' },
    ];

    testCases.forEach(({ iso, seconds, formatted }) => {
      const parsedSeconds = parseISO8601Duration(iso);
      expect(parsedSeconds).toBe(seconds);

      const formattedString = formatDurationString(parsedSeconds);
      expect(formattedString).toBe(formatted);

      const reparsedSeconds = parseDurationString(formattedString);
      expect(reparsedSeconds).toBe(seconds);
    });
  });
});
