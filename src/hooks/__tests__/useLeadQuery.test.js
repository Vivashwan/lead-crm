import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from '../../domain/query';
import { sampleLeads } from '../../test/fixtures';
import useLeadQuery from '../useLeadQuery';

describe('useLeadQuery', () => {
  it('filters, sorts and paginates', () => {
    const { result } = renderHook(() =>
      useLeadQuery(sampleLeads, {
        search: 'acme',
        filters: EMPTY_FILTERS,
        sort: { field: 'name', direction: 'desc' },
        page: 0,
        pageSize: 1,
      }),
    );
    expect(result.current.rows.map((l) => l.id)).toEqual(['c']);
    expect(result.current.total).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.filtered).toHaveLength(2);
  });

  it('returns stable results when inputs do not change', () => {
    const options = { filters: EMPTY_FILTERS, sort: { field: 'name', direction: 'asc' } };
    const { result, rerender } = renderHook(() => useLeadQuery(sampleLeads, options));
    const first = result.current.filtered;
    rerender();
    expect(result.current.filtered).toBe(first);
  });

  it('clamps a page that no longer exists', () => {
    const { result } = renderHook(() => useLeadQuery(sampleLeads, { page: 5, pageSize: 10 }));
    expect(result.current.page).toBe(0);
    expect(result.current.rows).toHaveLength(4);
  });
});
