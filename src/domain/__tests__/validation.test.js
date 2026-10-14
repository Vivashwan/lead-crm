import { describe, expect, it } from 'vitest';
import {
  findDuplicate,
  normalizeLead,
  normalizeMobile,
  sanitizeLead,
  toStoredMobile,
  validateLead,
} from '../validation';

const validInput = {
  name: '  Asha   Rao ',
  email: ' Asha@Example.COM ',
  mobile: ' 9876543210 ',
  status: 'new',
  priority: 'High',
};

describe('normalizeLead', () => {
  it('trims, collapses spaces, lowercases email, uppercases enums', () => {
    expect(normalizeLead(validInput)).toEqual({
      name: 'Asha Rao',
      email: 'asha@example.com',
      mobile: '9876543210',
      status: 'NEW',
      priority: 'HIGH',
    });
  });

  it('handles null, undefined and non-string values without throwing', () => {
    expect(normalizeLead(null)).toEqual({ name: '', email: '', mobile: '', status: '', priority: '' });
    expect(normalizeLead(undefined).name).toBe('');
    expect(normalizeLead({ name: {}, email: [], mobile: 9876543210 }).mobile).toBe('9876543210');
  });

  it('keeps mobile characters as typed so invalid input is reported, not silently fixed', () => {
    expect(normalizeMobile('98765-43210')).toBe('98765-43210');
    expect(normalizeMobile(9876543210)).toBe('9876543210');
  });

  it('converts the mobile to a number for storage', () => {
    expect(toStoredMobile('9876543210')).toBe(9876543210);
    expect(Number.isSafeInteger(toStoredMobile('9999999999'))).toBe(true);
  });
});

describe('validateLead', () => {
  const valid = normalizeLead(validInput);

  it('accepts a valid lead', () => {
    expect(validateLead(valid)).toEqual({ valid: true, errors: {} });
  });

  it('reports every missing field', () => {
    const { valid: ok, errors } = validateLead(normalizeLead({}));
    expect(ok).toBe(false);
    expect(Object.keys(errors).sort()).toEqual(['email', 'mobile', 'name', 'priority', 'status']);
    expect(errors.name).toMatch(/required/i);
  });

  it('handles a null lead', () => {
    expect(validateLead(null).valid).toBe(false);
  });

  it.each([
    ['name', 'A', /at least 2/],
    ['name', 'x'.repeat(101), /at most 100/],
    ['email', 'not-an-email', /valid email/],
    ['email', 'a@b', /valid email/],
    ['email', `${'a'.repeat(250)}@x.com`, /at most 254/],
    ['mobile', '98765abc10', /digits only/],
    ['mobile', '+919876543210', /digits only/],
    ['mobile', '98765 43210', /digits only/],
    ['mobile', '98765-43210', /digits only/],
    ['mobile', '9876.54321', /digits only/],
    ['mobile', '-987654321', /digits only/],
    ['mobile', '987654321', /exactly 10 digits/],
    ['mobile', '98765432101', /exactly 10 digits/],
    ['mobile', '12345', /exactly 10 digits/],
    ['mobile', '0876543210', /cannot start with 0/],
    ['status', 'BOGUS', /valid status/],
    ['priority', 'NONE', /valid priority/],
  ])('rejects invalid %s %#', (field, value, message) => {
    const { valid: ok, errors } = validateLead({ ...valid, [field]: value });
    expect(ok).toBe(false);
    expect(errors[field]).toMatch(message);
  });

  it('accepts boundary values', () => {
    expect(validateLead({ ...valid, name: 'Al', mobile: '1000000000' }).valid).toBe(true);
    expect(validateLead({ ...valid, name: 'x'.repeat(100), mobile: '9999999999' }).valid).toBe(true);
  });

  it('does not treat prototype keys as valid enums', () => {
    expect(validateLead({ ...valid, status: 'toString' }).errors.status).toBeDefined();
  });
});

describe('findDuplicate', () => {
  const existing = [
    { id: '1', email: 'asha@example.com', mobile: '9876543210' },
    { id: '2', email: 'ravi@example.com', mobile: '9123456789' },
  ];

  it('finds email duplicates case-insensitively', () => {
    expect(findDuplicate({ email: 'ASHA@example.com', mobile: '000' }, existing)).toMatchObject({
      field: 'email',
      lead: { id: '1' },
    });
  });

  it('finds mobile duplicates, whether stored as a number or text', () => {
    expect(findDuplicate({ email: 'new@x.com', mobile: 9123456789 }, existing)).toMatchObject({
      field: 'mobile',
      lead: { id: '2' },
    });
    expect(findDuplicate({ email: 'new@x.com', mobile: '9123456789' }, existing)).toMatchObject({
      field: 'mobile',
      lead: { id: '2' },
    });
  });

  it('ignores the lead being edited', () => {
    expect(findDuplicate(existing[0], existing, '1')).toBeNull();
  });

  it('returns null when unique or list is empty/has holes', () => {
    expect(findDuplicate({ email: 'new@x.com', mobile: '1112223' }, existing)).toBeNull();
    expect(findDuplicate({ email: 'a@b.co' }, [null, undefined])).toBeNull();
    expect(findDuplicate({ email: 'a@b.co' })).toBeNull();
  });
});

describe('sanitizeLead', () => {
  it('passes valid data through and converts timestamps to millis', () => {
    const ts = { toMillis: () => 1000 };
    expect(
      sanitizeLead('abc', {
        name: 'Asha',
        email: 'a@b.co',
        mobile: 9876543210,
        status: 'WON',
        priority: 'LOW',
        createdAt: ts,
        updatedAt: new Date(2000),
      }),
    ).toEqual({
      id: 'abc',
      name: 'Asha',
      email: 'a@b.co',
      mobile: '9876543210',
      status: 'WON',
      priority: 'LOW',
      createdAt: 1000,
      updatedAt: 2000,
    });
  });

  it('fills safe fallbacks for missing or malformed data', () => {
    expect(sanitizeLead(7, { status: 'WEIRD', priority: 42, name: '  ', createdAt: 'yesterday' })).toEqual({
      id: '7',
      name: 'Unnamed lead',
      email: '',
      mobile: '',
      status: 'NEW',
      priority: 'MEDIUM',
      createdAt: 0,
      updatedAt: 0,
    });
    expect(sanitizeLead('x', null).name).toBe('Unnamed lead');
  });
});
