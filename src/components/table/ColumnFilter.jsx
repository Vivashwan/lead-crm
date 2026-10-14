import { memo } from 'react';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { PRIORITY_LIST, PRIORITY_META, STATUS_LIST, STATUS_META } from '../../constants/leads';

const OPTIONS = {
  status: { list: STATUS_LIST, meta: STATUS_META },
  priority: { list: PRIORITY_LIST, meta: PRIORITY_META },
};

// Text "contains" box for text columns, multi-select for enum columns.
function ColumnFilter({ column, value, onChange }) {
  const label = `Filter by ${column.label.toLowerCase()}`;

  if (column.filter === 'select') {
    const { list, meta } = OPTIONS[column.id];
    return (
      <TextField
        select
        size="small"
        fullWidth
        value={value}
        onChange={(event) => onChange(column.id, event.target.value)}
        slotProps={{
          select: {
            multiple: true,
            displayEmpty: true,
            renderValue: (selected) => (selected.length ? selected.map((v) => meta[v].label).join(', ') : 'All'),
            inputProps: { 'aria-label': label },
          },
        }}
      >
        {list.map((option) => (
          <MenuItem key={option} value={option} dense>
            <Checkbox size="small" checked={value.includes(option)} sx={{ p: 0.5, mr: 1 }} />
            <ListItemText primary={meta[option].label} />
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      size="small"
      fullWidth
      type="search"
      placeholder="Search…"
      value={value}
      onChange={(event) => onChange(column.id, event.target.value)}
      slotProps={{ htmlInput: { 'aria-label': label, maxLength: 100 } }}
    />
  );
}

export default memo(ColumnFilter);
