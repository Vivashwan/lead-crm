import { memo, useState } from 'react';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FilterListIcon from '@mui/icons-material/FilterList';
import { COLUMNS } from '../../constants/leads';
import { hasActiveFilters } from '../../domain/query';
import { EmailLink, PhoneLink } from '../leads/ContactLinks';
import LeadActions from '../leads/LeadActions';
import PriorityChip from '../leads/PriorityChip';
import StatusChip from '../leads/StatusChip';
import ColumnFilter from './ColumnFilter';

const SORT_OPTIONS = [
  ...COLUMNS.flatMap((c) => [
    { value: `${c.id}:asc`, label: `${c.label} ↑` },
    { value: `${c.id}:desc`, label: `${c.label} ↓` },
  ]),
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
];

const LeadCard = memo(function LeadCard({ lead, onEdit, onDelete }) {
  return (
    <Card variant="outlined" component="article" aria-label={lead.name}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{lead.name}</Typography>
          <LeadActions lead={lead} onEdit={onEdit} onDelete={onDelete} />
        </Stack>
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
          <EmailLink email={lead.email} />
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <PhoneLink mobile={lead.mobile} />
        </Typography>
        <Stack direction="row" spacing={1}>
          <StatusChip status={lead.status} />
          <PriorityChip priority={lead.priority} />
        </Stack>
      </CardContent>
    </Card>
  );
});

// Phone layout: stacked cards, sort dropdown and a collapsible per-column filter panel.
export default function LeadCardList({ rows, sort, onSortSelect, filters, onFilterChange, onEdit, onDelete, footer, empty }) {
  const [showFilters, setShowFilters] = useState(false);
  const active = hasActiveFilters(filters);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label="Sort by"
          value={`${sort.field}:${sort.direction}`}
          onChange={(event) => {
            const [field, direction] = event.target.value.split(':');
            onSortSelect({ field, direction });
          }}
          sx={{ flex: 1 }}
          slotProps={{ select: { native: true } }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </TextField>
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          startIcon={
            <Badge color="secondary" variant="dot" invisible={!active}>
              <FilterListIcon />
            </Badge>
          }
        >
          Filters
        </Button>
      </Stack>
      <Collapse in={showFilters} unmountOnExit>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1.5}>
            {COLUMNS.map((column) => (
              <Stack key={column.id} spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {column.label}
                </Typography>
                <ColumnFilter column={column} value={filters[column.id]} onChange={onFilterChange} />
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Collapse>
      {rows.map((lead) => (
        <LeadCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} />
      ))}
      {rows.length === 0 && <Paper variant="outlined">{empty}</Paper>}
      {footer}
    </Stack>
  );
}
