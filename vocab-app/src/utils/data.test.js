import { describe, expect, it } from 'vitest';
import { getReviewTimestamp, isReviewDue, parseExampleItem, splitExampleLines } from './data';

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

describe('parseExampleItem', () => {
  it('parses legacy Cambridge string with collocation prefix', () => {
    const res = parseExampleItem('sheer hell Work is sheer hell at the moment.');
    expect(res.text).toBe('Work is sheer hell at the moment.');
    expect(res.collocation).toBe('sheer hell');
    expect(res.lines).toEqual(['Work is sheer hell at the moment.']);
  });

  it('parses legacy Cambridge string with quotes and collocation', () => {
    const res = parseExampleItem('go to hell I\'ll go to Hell for this.');
    expect(res.text).toBe('I\'ll go to Hell for this.');
    expect(res.collocation).toBe('go to hell');
  });

  it('leaves standard sentences without collocation untouched', () => {
    const res = parseExampleItem('The last few months have been absolute hell.');
    expect(res.text).toBe('The last few months have been absolute hell.');
    expect(res.collocation).toBeNull();
  });

  it('handles object input seamlessly', () => {
    const res = parseExampleItem({
      text: 'Work is sheer hell at the moment.',
      translation: '目前的工作如同在地獄一般。',
      collocation: 'sheer hell'
    });
    expect(res.text).toBe('Work is sheer hell at the moment.');
    expect(res.collocation).toBe('sheer hell');
    expect(res.translation).toBe('目前的工作如同在地獄一般。');
    expect(res.lines).toEqual([
      'Work is sheer hell at the moment.',
      '目前的工作如同在地獄一般。'
    ]);
  });
});

describe('splitExampleLines', () => {
  it('handles empty input', () => {
    expect(splitExampleLines(null)).toEqual([]);
    expect(splitExampleLines('')).toEqual([]);
  });

  it('handles object example structure with text, translation, and collocation', () => {
    const exampleObj = {
      text: 'Work is sheer hell at the moment.',
      translation: '目前的工作如同在地獄一般。',
      collocation: 'sheer hell'
    };
    expect(splitExampleLines(exampleObj)).toEqual([
      'Work is sheer hell at the moment.',
      '目前的工作如同在地獄一般。'
    ]);
  });

  it('handles object example with only text', () => {
    const exampleObj = {
      text: 'Work is sheer hell at the moment.',
      collocation: 'sheer hell'
    };
    expect(splitExampleLines(exampleObj)).toEqual([
      'Work is sheer hell at the moment.'
    ]);
  });

  it('handles legacy newline string', () => {
    expect(splitExampleLines('Line 1\nLine 2')).toEqual(['Line 1', 'Line 2']);
  });

  it('handles legacy CJK inline string', () => {
    expect(splitExampleLines('Hello world 你好世界')).toEqual(['Hello world', '你好世界']);
  });
});
