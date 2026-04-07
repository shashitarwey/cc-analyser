import { fmtCurrency, fmtSignedCurrency, fmtDate, fmtDisplay, ordinalSuffix, pickTruthy } from '../utils/formatters';

describe('fmtCurrency', () => {
  it('formats positive numbers with ₹ and Indian locale', () => {
    expect(fmtCurrency(12345)).toBe('₹12,345');
  });

  it('handles zero', () => {
    expect(fmtCurrency(0)).toBe('₹0');
  });

  it('handles null/undefined as zero', () => {
    expect(fmtCurrency(null)).toBe('₹0');
    expect(fmtCurrency(undefined)).toBe('₹0');
  });
});

describe('fmtSignedCurrency', () => {
  it('adds + for positive values', () => {
    expect(fmtSignedCurrency(500)).toMatch(/^\+/);
  });

  it('no + for negative values', () => {
    expect(fmtSignedCurrency(-200)).not.toMatch(/^\+/);
  });
});

describe('fmtDate', () => {
  it('formats a Date to yyyy-MM-dd', () => {
    const d = new Date(2026, 3, 8); // April 8, 2026
    expect(fmtDate(d)).toBe('2026-04-08');
  });
});

describe('fmtDisplay', () => {
  it('converts ISO date to dd-MM-yyyy', () => {
    expect(fmtDisplay('2026-04-08')).toBe('08-04-2026');
  });

  it('returns empty string for falsy input', () => {
    expect(fmtDisplay('')).toBe('');
    expect(fmtDisplay(null)).toBe('');
  });
});

describe('ordinalSuffix', () => {
  it('handles 1st, 2nd, 3rd', () => {
    expect(ordinalSuffix(1)).toBe('1st');
    expect(ordinalSuffix(2)).toBe('2nd');
    expect(ordinalSuffix(3)).toBe('3rd');
  });

  it('handles 11th, 12th, 13th (special cases)', () => {
    expect(ordinalSuffix(11)).toBe('11th');
    expect(ordinalSuffix(12)).toBe('12th');
    expect(ordinalSuffix(13)).toBe('13th');
  });

  it('handles 21st, 22nd, 23rd', () => {
    expect(ordinalSuffix(21)).toBe('21st');
    expect(ordinalSuffix(22)).toBe('22nd');
    expect(ordinalSuffix(23)).toBe('23rd');
  });

  it('handles regular th numbers', () => {
    expect(ordinalSuffix(4)).toBe('4th');
    expect(ordinalSuffix(15)).toBe('15th');
    expect(ordinalSuffix(31)).toBe('31st');
  });
});

describe('pickTruthy', () => {
  it('strips empty strings, null, undefined but keeps 0', () => {
    const result = pickTruthy({ a: 'hello', b: '', c: null, d: undefined, e: 0 });
    expect(result).toEqual({ a: 'hello', e: 0 });
  });
});
