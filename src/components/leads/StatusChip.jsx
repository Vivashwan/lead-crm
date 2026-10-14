import { memo } from 'react';
import Chip from '@mui/material/Chip';
import { STATUS_META } from '../../constants/leads';

function StatusChip({ status, size = 'small' }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return <Chip label={meta.label} color={meta.color} size={size} variant="outlined" />;
}

export default memo(StatusChip);
