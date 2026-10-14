import { memo } from 'react';
import Chip from '@mui/material/Chip';
import { PRIORITY_META } from '../../constants/leads';

function PriorityChip({ priority, size = 'small' }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  return <Chip label={meta.label} color={meta.color} size={size} />;
}

export default memo(PriorityChip);
