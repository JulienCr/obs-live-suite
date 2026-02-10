import {
  smallestDivisorAtLeast,
  bestMinorDivisions,
  computeTickIntervals,
  generateTicks,
  formatTime,
} from '@/components/assets/VideoTimeline';
import type { TickIntervals, TimelineTick } from '@/components/assets/VideoTimeline';

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats 3661 seconds as 1:01:01', () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });

  it('formats 59 seconds as 0:59', () => {
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats 3600 seconds as 1:00:00', () => {
    expect(formatTime(3600)).toBe('1:00:00');
  });
});

describe('smallestDivisorAtLeast', () => {
  it('returns 1 when min=1', () => {
    expect(smallestDivisorAtLeast(60, 1)).toBe(1);
  });

  it('returns 10 when min=7 (7,8,9 do not divide 60, but 10 does)', () => {
    expect(smallestDivisorAtLeast(60, 7)).toBe(10);
  });

  it('returns 60 when min=60', () => {
    expect(smallestDivisorAtLeast(60, 60)).toBe(60);
  });

  it('returns base when min exceeds base (min=61 falls through to return base)', () => {
    expect(smallestDivisorAtLeast(60, 61)).toBe(60);
  });

  it('returns 1 when min=0 (Math.max(1, ceil(0)) = 1)', () => {
    expect(smallestDivisorAtLeast(60, 0)).toBe(1);
  });

  it('returns 5 when min=5', () => {
    expect(smallestDivisorAtLeast(60, 5)).toBe(5);
  });
});

describe('bestMinorDivisions', () => {
  it('returns 1 when majorInterval <= 1', () => {
    expect(bestMinorDivisions(1)).toBe(1);
  });

  it('returns 6 for majorInterval=30', () => {
    expect(bestMinorDivisions(30)).toBe(6);
  });

  it('returns 6 for majorInterval=60', () => {
    expect(bestMinorDivisions(60)).toBe(6);
  });

  it('returns 5 for majorInterval=10', () => {
    expect(bestMinorDivisions(10)).toBe(5);
  });

  it('returns 6 for majorInterval=3600', () => {
    expect(bestMinorDivisions(3600)).toBe(6);
  });
});

describe('computeTickIntervals', () => {
  it('duration=60: major=10, minor=2', () => {
    const result: TickIntervals = computeTickIntervals(60);
    expect(result.major).toBe(10);
    expect(result.minor).toBe(2);
  });

  it('duration=300: major=60, minor=10', () => {
    const result: TickIntervals = computeTickIntervals(300);
    expect(result.major).toBe(60);
    expect(result.minor).toBe(10);
  });

  it('duration=600: major=120, minor=20', () => {
    const result: TickIntervals = computeTickIntervals(600);
    expect(result.major).toBe(120);
    expect(result.minor).toBe(20);
  });

  it('duration=30: major=4, minor=1', () => {
    const result: TickIntervals = computeTickIntervals(30);
    expect(result.major).toBe(4);
    expect(result.minor).toBe(1);
  });

  it('major and minor are always positive numbers', () => {
    const durations = [1, 10, 30, 60, 120, 300, 600, 3600, 7200, 36000];
    for (const d of durations) {
      const result = computeTickIntervals(d);
      expect(result.major).toBeGreaterThan(0);
      expect(result.minor).toBeGreaterThan(0);
    }
  });
});

describe('generateTicks', () => {
  it('returns empty array when duration <= 0', () => {
    expect(generateTicks(0)).toEqual([]);
    expect(generateTicks(-5)).toEqual([]);
  });

  it('returns at least one tick for any positive duration', () => {
    const durations = [0.5, 1, 10, 60, 300, 3600];
    for (const d of durations) {
      const ticks = generateTicks(d);
      expect(ticks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('last tick is always at exactly duration with a label', () => {
    const durations = [10, 30, 60, 120, 300, 600, 3600];
    for (const d of durations) {
      const ticks = generateTicks(d);
      const last = ticks[ticks.length - 1];
      expect(last.time).toBe(d);
      expect(last.label).toBeDefined();
    }
  });

  it('for duration=60: first tick at 0 with label "0:00", last with label "1:00"', () => {
    const ticks = generateTicks(60);
    expect(ticks[0].time).toBe(0);
    expect(ticks[0].label).toBe('0:00');
    const last = ticks[ticks.length - 1];
    expect(last.label).toBe('1:00');
  });

  it('major ticks have labels, minor ticks do not', () => {
    const ticks = generateTicks(60);
    for (const tick of ticks) {
      if (tick.isMajor) {
        expect(tick.label).toBeDefined();
      } else {
        expect(tick.label).toBeUndefined();
      }
    }
  });

  it('tick times are strictly increasing (no overlaps)', () => {
    const durations = [30, 60, 120, 300, 600, 3600];
    for (const d of durations) {
      const ticks = generateTicks(d);
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i].time).toBeGreaterThan(ticks[i - 1].time);
      }
    }
  });
});
