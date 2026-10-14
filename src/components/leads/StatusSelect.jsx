import { memo } from 'react';
import TextField from '@mui/material/TextField';
import { STATUS_LIST, STATUS_META } from '../../constants/leads';

// Native select: works with keyboard, touch and screen readers; used on kanban cards.
function StatusSelect({ value, onChange, label = 'Status', disabled = false, sx }) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      sx={sx}
      slotProps={{ select: { native: true }, htmlInput: { 'aria-label': label } }}
    >
      {STATUS_LIST.map((status) => (
        <option key={status} value={status}>
          {STATUS_META[status].label}
        </option>
      ))}
    </TextField>
  );
}

export default memo(StatusSelect);
