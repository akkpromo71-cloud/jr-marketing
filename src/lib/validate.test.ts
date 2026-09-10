import { describe, it, expect } from 'vitest';
import {
  safeUrl,
  clampRating,
  positiveNumberOrNull,
  nonNegativeIntOrNull,
  futureDateOrNull,
  clampText,
  smallPositiveInt,
} from './validate';

describe('safeUrl', () => {
  it('accepts http/https URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com');
    expect(safeUrl('http://example.com/path?x=1')).toBe('http://example.com/path?x=1');
  });

  it('rejects javascript: and other dangerous protocols', () => {
    // Это основная причина, по которой safeUrl вообще существует — без него
    // <a href={track_url}> мог бы выполнить произвольный код в браузере
    // того, кто откроет ссылку (например, администратора).
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('returns null for empty or missing input', () => {
    expect(safeUrl('')).toBeNull();
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(safeUrl('not a url')).toBeNull();
  });
});

describe('clampRating', () => {
  it('clamps to the 1-5 range', () => {
    expect(clampRating('0')).toBe(1);
    expect(clampRating('-5')).toBe(1);
    expect(clampRating('999')).toBe(5);
  });

  it('rounds to the nearest integer', () => {
    expect(clampRating('3.6')).toBe(4);
    expect(clampRating('3.4')).toBe(3);
  });

  it('defaults to 5 for missing or non-numeric input', () => {
    expect(clampRating(null)).toBe(5);
    expect(clampRating('not a number')).toBe(5);
  });
});

describe('positiveNumberOrNull', () => {
  it('accepts positive numbers', () => {
    expect(positiveNumberOrNull('100')).toBe(100);
    expect(positiveNumberOrNull('0.5')).toBe(0.5);
  });

  it('rejects zero and negative numbers', () => {
    // Ядро задачи #55 (CHECK-ограничения в БД) — эта же проверка на уровне
    // приложения, первый (не единственный) рубеж защиты от отрицательных сумм.
    expect(positiveNumberOrNull('0')).toBeNull();
    expect(positiveNumberOrNull('-10')).toBeNull();
  });

  it('rejects non-numeric or missing input', () => {
    expect(positiveNumberOrNull('abc')).toBeNull();
    expect(positiveNumberOrNull(null)).toBeNull();
  });
});

describe('futureDateOrNull', () => {
  const iso = (offsetDays: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  it('accepts a date from tomorrow onward', () => {
    expect(futureDateOrNull(iso(1))).toBe(iso(1));
    expect(futureDateOrNull(iso(30))).toBe(iso(30));
  });

  it('rejects today and past dates', () => {
    expect(futureDateOrNull(iso(0))).toBeNull();
    expect(futureDateOrNull(iso(-1))).toBeNull();
  });

  it('rejects empty, malformed, or non-date input', () => {
    expect(futureDateOrNull('')).toBeNull();
    expect(futureDateOrNull(null)).toBeNull();
    expect(futureDateOrNull('2026/01/01')).toBeNull();
    expect(futureDateOrNull('2026-13-40')).toBeNull();
  });
});

describe('clampText', () => {
  it('trims and enforces the max length', () => {
    expect(clampText('  hi  ', 10)).toBe('hi');
    expect(clampText('abcdefghij', 5)).toBe('abcde');
  });

  it('returns null for empty / whitespace-only / missing input', () => {
    expect(clampText('', 10)).toBeNull();
    expect(clampText('   ', 10)).toBeNull();
    expect(clampText(null, 10)).toBeNull();
  });
});

describe('smallPositiveInt', () => {
  it('accepts a positive integer within the cap', () => {
    expect(smallPositiveInt('3', 1)).toBe(3);
  });

  it('falls back for zero, negative, non-numeric or missing input', () => {
    expect(smallPositiveInt('0', 1)).toBe(1);
    expect(smallPositiveInt('-5', 1)).toBe(1);
    expect(smallPositiveInt('abc', 2)).toBe(2);
    expect(smallPositiveInt(null, 1)).toBe(1);
  });

  it('caps at the maximum', () => {
    expect(smallPositiveInt('999', 1)).toBe(20);
  });
});

describe('nonNegativeIntOrNull', () => {
  it('accepts zero, unlike positiveNumberOrNull', () => {
    expect(nonNegativeIntOrNull('0')).toBe(0);
  });

  it('floors non-integer input', () => {
    expect(nonNegativeIntOrNull('50000.9')).toBe(50000);
  });

  it('rejects negative, non-numeric, or missing input', () => {
    expect(nonNegativeIntOrNull('-1')).toBeNull();
    expect(nonNegativeIntOrNull('abc')).toBeNull();
    expect(nonNegativeIntOrNull(null)).toBeNull();
    expect(nonNegativeIntOrNull('')).toBeNull();
  });
});

