import { describe, it, expect } from 'vitest';
import { BANK_NAMES, CARD_NETWORKS, ECOMM_SITES, VARIANTS, DELIVERY_STATUS_OPTIONS, STATUS_FILTER_OPTIONS, PAGE_SIZE } from '../constants';

describe('Constants', () => {
  it('BANK_NAMES is sorted alphabetically', () => {
    const sorted = [...BANK_NAMES].sort((a, b) => a.localeCompare(b));
    expect(BANK_NAMES).toEqual(sorted);
  });

  it('CARD_NETWORKS has expected values', () => {
    expect(CARD_NETWORKS).toContain('Visa');
    expect(CARD_NETWORKS).toContain('Mastercard');
    expect(CARD_NETWORKS).toContain('AmEx');
    expect(CARD_NETWORKS).toContain('RuPay');
  });

  it('ECOMM_SITES includes major platforms', () => {
    expect(ECOMM_SITES).toContain('Amazon');
    expect(ECOMM_SITES).toContain('Flipkart');
    expect(ECOMM_SITES).toContain('Other');
  });

  it('VARIANTS includes NA as first option', () => {
    expect(VARIANTS[0]).toBe('NA');
  });

  it('DELIVERY_STATUS_OPTIONS has 3 statuses', () => {
    expect(DELIVERY_STATUS_OPTIONS).toHaveLength(3);
    const values = DELIVERY_STATUS_OPTIONS.map(o => o.value);
    expect(values).toEqual(['No', 'Yes', 'Cancelled']);
  });

  it('STATUS_FILTER_OPTIONS starts with All', () => {
    expect(STATUS_FILTER_OPTIONS[0]).toBe('All');
  });

  it('PAGE_SIZE is a positive number', () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });
});
