import { useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT, PAGE_SIZE_OPTIONS, STORAGE_KEYS } from '../../constants/leads';
import { EMPTY_FILTERS, SORTABLE_FIELDS, hasActiveFilters } from '../../domain/query';
import useDebounce from '../../hooks/useDebounce';
import useLeadQuery from '../../hooks/useLeadQuery';
import usePersistentState from '../../hooks/usePersistentState';
import EmptyState from '../common/EmptyState';
import LeadCardList from './LeadCardList';
import LeadTable from './LeadTable';

const isValidSort = (s) =>
  s && SORTABLE_FIELDS.includes(s.field) && (s.direction === 'asc' || s.direction === 'desc');
const isValidPageSize = (n) => PAGE_SIZE_OPTIONS.includes(n);

export default function TableView({ leads, search, onClearSearch, onAdd, onEdit, onDelete }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const [sort, setSort] = usePersistentState(STORAGE_KEYS.SORT, DEFAULT_SORT, isValidSort);
  const [pageSize, setPageSize] = usePersistentState(STORAGE_KEYS.PAGE_SIZE, DEFAULT_PAGE_SIZE, isValidPageSize);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const debouncedFilters = useDebounce(filters);

  // Page resets to 0 whenever the result set changes (search, filters, sort, page size).
  const queryKey = JSON.stringify([search, debouncedFilters, sort, pageSize]);
  const [pageState, setPageState] = useState({ key: queryKey, page: 0 });
  const requestedPage = pageState.key === queryKey ? pageState.page : 0;

  const { rows, page, total } = useLeadQuery(leads, {
    search,
    filters: debouncedFilters,
    sort,
    page: requestedPage,
    pageSize,
  });

  const handleFilterChange = useCallback((field, value) => setFilters((f) => ({ ...f, [field]: value })), []);

  const handleSortChange = useCallback(
    (field) =>
      setSort((s) => (s.field === field ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { field, direction: 'asc' })),
    [setSort],
  );

  const filtersActive = hasActiveFilters(filters) || Boolean(search.trim());
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    onClearSearch();
  };

  const empty =
    leads.length === 0 ? (
      <EmptyState title="No leads yet" message="Add your first lead to get started." actionLabel="Add lead" onAction={onAdd} />
    ) : (
      <EmptyState title="No leads match your search" actionLabel="Clear filters" onAction={clearAll} />
    );

  const footer = (
    <TablePagination
      component="div"
      count={total}
      page={page}
      rowsPerPage={pageSize}
      rowsPerPageOptions={PAGE_SIZE_OPTIONS}
      onPageChange={(_event, next) => setPageState({ key: queryKey, page: next })}
      onRowsPerPageChange={(event) => setPageSize(Number(event.target.value))}
      labelRowsPerPage={isPhone ? 'Rows:' : 'Rows per page:'}
    />
  );

  const shared = { rows, sort, filters, onFilterChange: handleFilterChange, onEdit, onDelete, footer, empty };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {total === leads.length ? `${total} leads` : `${total} of ${leads.length} leads`}
        </Typography>
        {filtersActive && (
          <Button size="small" onClick={clearAll}>
            Clear filters
          </Button>
        )}
      </Stack>
      {isPhone ? (
        <LeadCardList {...shared} onSortSelect={setSort} />
      ) : (
        <LeadTable {...shared} onSortChange={handleSortChange} />
      )}
    </Stack>
  );
}
