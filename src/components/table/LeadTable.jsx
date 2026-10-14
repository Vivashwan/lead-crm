import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { COLUMNS } from '../../constants/leads';
import ColumnFilter from './ColumnFilter';
import LeadTableRow from './LeadTableRow';

// Desktop/tablet table: header row 1 = sortable titles, row 2 = per-column search.
export default function LeadTable({ rows, sort, onSortChange, filters, onFilterChange, onEdit, onDelete, footer, empty }) {
  return (
    <Paper variant="outlined">
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-label="Leads" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => {
                const active = sort.field === column.id;
                return (
                  <TableCell
                    key={column.id}
                    sortDirection={active ? sort.direction : false}
                    sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    <TableSortLabel
                      active={active}
                      direction={active ? sort.direction : 'asc'}
                      onClick={() => onSortChange(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                );
              })}
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell key={column.id} sx={{ py: 1, minWidth: column.filter === 'select' ? 130 : 150 }}>
                  <ColumnFilter column={column} value={filters[column.id]} onChange={onFilterChange} />
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((lead) => (
              <LeadTableRow key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} />
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 1}>{empty}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {footer}
    </Paper>
  );
}
