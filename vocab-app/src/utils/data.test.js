import { describe, expect, it } from 'vitest';
import { getReviewTimestamp, isReviewDue } from './data';

describe('review date helpers', () => {
  it('treats null as due', () => {
    expect(isReviewDue(null)).toBe(true);
  });

  it('returns true for past dates', () => {
    const reference = new Date('2024-02-02T00:00:00.000Z');
    expect(isReviewDue('2024-02-01T00:00:00.000Z', reference)).toBe(true);
  });

  it('returns false for future dates', () => {
    const reference = new Date('2024-02-02T00:00:00.000Z');
    expect(isReviewDue('2024-02-03T00:00:00.000Z', reference)).toBe(false);
  });

  it('returns 0 for missing review timestamp', () => {
    expect(getReviewTimestamp(null)).toBe(0);
  });
});
