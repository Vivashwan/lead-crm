import { useMemo } from 'react';
import { EMPTY_FILTERS, paginate, queryLeads } from '../domain/query';

// Table pipeline: search → column filters → sort → paginate, memoized per input.
export default function useLeadQuery(leads, { search = '', filters = EMPTY_FILTERS, sort, page = 0, pageSize = 10 }) {
  const filtered = useMemo(() => queryLeads(leads, { search, filters, sort }), [leads, search, filters, sort]);
  const pageResult = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);
  return { ...pageResult, rows: pageResult.items, filtered };
}
