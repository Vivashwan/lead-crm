import { memo } from 'react';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

function LeadActions({ lead, onEdit, onDelete }) {
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Edit">
        <IconButton size="small" aria-label={`Edit ${lead.name}`} onClick={() => onEdit(lead)}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" aria-label={`Delete ${lead.name}`} onClick={() => onDelete(lead)}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default memo(LeadActions);
