import { describe, it, expect } from 'vitest';
import { fmtCurrency, fmtSignedCurrency, profitColor, cardLabel, sellerLabel, pickTruthy } from '../utils/formatters';

describe('fmtCurrency', () => {
  it('formats positive numbers', () => {
    expect(fmtCurrency(12345)).toBe('₹12,345');
  });

  it('handles zero', () => {
    expect(fmtCurrency(0)).toBe('₹0');
  });

  it('handles null/undefined', () => {
    expect(fmtCurrency(null)).toBe('₹0');
    expect(fmtCurrency(undefined)).toBe('₹0');
  });
});

describe('fmtSignedCurrency', () => {
  it('adds + for positive values', () => {
    expect(fmtSignedCurrency(500)).toBe('+₹500');
  });

  it('no + for negative or zero', () => {
    expect(fmtSignedCurrency(-200)).toMatch(/₹/);
    expect(fmtSignedCurrency(0)).toBe('₹0');
  });
});

describe('profitColor', () => {
  it('returns success for positive', () => {
    expect(profitColor(100)).toBe('var(--success)');
  });

  it('returns danger for negative', () => {
    expect(profitColor(-50)).toBe('var(--danger)');
  });

  it('returns inherit for zero', () => {
    expect(profitColor(0)).toBe('inherit');
  });
});

describe('cardLabel', () => {
  it('formats card label', () => {
    expect(cardLabel({ bank_name: 'HDFC Bank', last_four_digit: '1234' }))
      .toBe('HDFC Bank ••••1234');
  });

  it('handles null', () => {
    expect(cardLabel(null)).toBe('');
  });
});

describe('sellerLabel', () => {
  it('formats seller label', () => {
    expect(sellerLabel({ name: 'Prakash', city: 'Delhi' }))
      .toBe('Prakash (Delhi)');
  });

  it('handles null', () => {
    expect(sellerLabel(null)).toBe('');
  });
});

describe('pickTruthy', () => {
  it('removes empty strings and nulls', () => {
    expect(pickTruthy({ a: 'hello', b: '', c: null, d: 'world' }))
      .toEqual({ a: 'hello', d: 'world' });
  });

  it('keeps zero values (only filters empty string/null/undefined)', () => {
    expect(pickTruthy({ a: 0, b: 1 })).toEqual({ a: 0, b: 1 });
  });
});
