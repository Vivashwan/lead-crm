import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  groupByStatus,
  hasActiveFilters,
  matchesFilters,
  matchesSearch,
  paginate,
  queryLeads,
  sortLeads,
} from '../query';

const leads = [
  { id: 'a', name: 'Asha Rao', email: 'asha@acme.com', mobile: '9876543210', status: 'NEW', priority: 'HIGH', createdAt: 300 },
  { id: 'b', name: 'bharat Singh', email: 'bharat@zen.io', mobile: '9123456789', status: 'WON', priority: 'LOW', createdAt: 100 },
  { id: 'c', name: 'Chen Li', email: 'chen@acme.com', mobile: '7700900123', status: 'NEW', priority: 'URGENT', createdAt: 200 },
  { id: 'd', name: 'Dana Fox', email: 'dana@fox.dev', mobile: '5551234567', status: 'PROPOSAL', priority: 'MEDIUM', createdAt: 400 },
];
const ids = (list) => list.map((l) => l.id);

describe('matchesSearch', () => {
  it('matches every lead for an empty or blank search', () => {
    expect(leads.every((l) => matchesSearch(l, ''))).toBe(true);
    expect(leads.every((l) => matchesSearch(l, '   '))).toBe(true);
  });

  it.each([
    ['name, case-insensitive', 'ASHA', ['a']],
    ['email domain', 'acme', ['a', 'c']],
    ['mobile with spaces', '98765 43210', ['a']],
    ['partial mobile', '7700', ['c']],
    ['status label', 'proposal', ['d']],
    ['priority label', 'urgent', ['c']],
  ])('searches by %s', (_, term, expected) => {
    expect(ids(leads.filter((l) => matchesSearch(l, term)))).toEqual(expected);
  });

  it('returns nothing for a non-matching term', () => {
    expect(leads.filter((l) => matchesSearch(l, 'zzz'))).toHaveLength(0);
  });
});

describe('matchesFilters (per-column search)', () => {
  const filter = (f) => ids(leads.filter((l) => matchesFilters(l, { ...EMPTY_FILTERS, ...f })));

  it('filters by each text column', () => {
    expect(filter({ name: 'li' })).toEqual(['c']);
    expect(filter({ email: '.io' })).toEqual(['b']);
    expect(filter({ mobile: '555-123' })).toEqual(['d']);
  });

  it('filters by multi-select status and priority', () => {
    expect(filter({ status: ['NEW'] })).toEqual(['a', 'c']);
    expect(filter({ status: ['NEW', 'WON'], priority: ['LOW', 'URGENT'] })).toEqual(['b', 'c']);
  });

  it('combines filters with AND', () => {
    expect(filter({ email: 'acme', priority: ['HIGH'] })).toEqual(['a']);
  });

  it('tolerates missing filter object', () => {
    expect(matchesFilters(leads[0])).toBe(true);
  });

  it('detects active filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, name: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: ['WON'] })).toBe(true);
  });
});

describe('sortLeads', () => {
  it.each([
    ['name', 'asc', ['a', 'b', 'c', 'd']],
    ['name', 'desc', ['d', 'c', 'b', 'a']],
    ['email', 'asc', ['a', 'b', 'c', 'd']],
    ['mobile', 'asc', ['d', 'c', 'b', 'a']],
    ['status', 'asc', ['a', 'c', 'd', 'b']], // NEW (newest first on tie), PROPOSAL, WON
    ['priority', 'desc', ['c', 'a', 'd', 'b']],
    ['priority', 'asc', ['b', 'd', 'a', 'c']],
    ['createdAt', 'desc', ['d', 'a', 'c', 'b']],
  ])('sorts by %s %s', (field, direction, expected) => {
    expect(ids(sortLeads(leads, { field, direction }))).toEqual(expected);
  });

  it('sorts names case-insensitively (bharat between Asha and Chen)', () => {
    expect(ids(sortLeads(leads, { field: 'name', direction: 'asc' }))[1]).toBe('b');
  });

  it('defaults to newest first for unknown fields and does not mutate input', () => {
    const copy = [...leads];
    expect(ids(sortLeads(leads, { field: 'hack' }))).toEqual(['d', 'a', 'c', 'b']);
    expect(leads).toEqual(copy);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);

  it('returns the requested page', () => {
    expect(paginate(items, 1, 10)).toEqual({
      items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      page: 1,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it('returns a partial last page', () => {
    expect(paginate(items, 2, 10).items).toEqual([20, 21, 22]);
  });

  it('clamps out-of-range pages', () => {
    expect(paginate(items, 99, 10).page).toBe(2);
    expect(paginate(items, -3, 10).page).toBe(0);
  });

  it('handles empty lists and invalid page sizes', () => {
    expect(paginate([], 0, 10)).toMatchObject({ items: [], page: 0, total: 0, totalPages: 1 });
    expect(paginate(items, 0, 0).pageSize).toBe(10);
    expect(paginate(items, 'x', 25).page).toBe(0);
  });
});

describe('queryLeads', () => {
  it('applies search, then column filters, then sort', () => {
    const result = queryLeads(leads, {
      search: 'acme',
      filters: { ...EMPTY_FILTERS, status: ['NEW'] },
      sort: { field: 'priority', direction: 'desc' },
    });
    expect(ids(result)).toEqual(['c', 'a']);
  });

  it('works with no options', () => {
    expect(ids(queryLeads(leads))).toEqual(['d', 'a', 'c', 'b']);
  });
});

describe('groupByStatus', () => {
  it('creates every column in order, sorted by priority within each', () => {
    const groups = groupByStatus(leads);
    expect(Object.keys(groups)).toEqual(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']);
    expect(ids(groups.NEW)).toEqual(['c', 'a']);
    expect(groups.CONTACTED).toEqual([]);
  });
});
