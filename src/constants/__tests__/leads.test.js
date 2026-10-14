import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MOBILE_REGEX,
  EMAIL_REGEX,
  PRIORITY_LIST,
  PRIORITY_META,
  STATUS_LIST,
  STATUS_META,
} from '../leads';

describe('lead constants', () => {
  it('orders statuses as kanban columns', () => {
    expect(STATUS_LIST).toEqual(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']);
  });

  it('orders priorities low to urgent', () => {
    expect(PRIORITY_LIST).toEqual(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
  });

  it('has metadata for every enum value', () => {
    STATUS_LIST.forEach((s) => expect(STATUS_META[s].label).toBeTruthy());
    PRIORITY_LIST.forEach((p) => expect(PRIORITY_META[p].label).toBeTruthy());
  });

  it('keeps firestore.rules enums in sync', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    [...STATUS_LIST, ...PRIORITY_LIST].forEach((v) => expect(rules).toContain(`'${v}'`));
  });

  it('validates mobile and email patterns', () => {
    expect(MOBILE_REGEX.test('9876543210')).toBe(true);
    expect(MOBILE_REGEX.test('+919876543210')).toBe(false);
    expect(MOBILE_REGEX.test('98765432101')).toBe(false);
    expect(MOBILE_REGEX.test('0876543210')).toBe(false);
    expect(MOBILE_REGEX.test('98765abc10')).toBe(false);
    expect(EMAIL_REGEX.test('a@b.co')).toBe(true);
    expect(EMAIL_REGEX.test('a@b')).toBe(false);
  });
});
