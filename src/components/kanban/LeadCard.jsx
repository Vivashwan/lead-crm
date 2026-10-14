import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { EmailLink, PhoneLink } from '../leads/ContactLinks';
import LeadActions from '../leads/LeadActions';
import PriorityChip from '../leads/PriorityChip';
import StatusSelect from '../leads/StatusSelect';

// Presentational card; also rendered inside the DragOverlay.
export function LeadCardBody({ lead, onEdit, onDelete, onStatusChange, handle, dragging = false }) {
  return (
    <Card
      variant="outlined"
      component="article"
      aria-label={lead.name}
      sx={{ opacity: dragging ? 0.4 : 1, boxShadow: handle === null ? 6 : 0 }}
    >
      <CardContent sx={{ p: 1.5, pb: '12px !important' }}>
        <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 0.5 }}>
          {handle}
          <Typography sx={{ fontWeight: 600, flex: 1, overflowWrap: 'anywhere', pt: 0.5 }}>{lead.name}</Typography>
          <PriorityChip priority={lead.priority} />
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
          <EmailLink email={lead.email} />
        </Typography>
        <Typography variant="body2">
          <PhoneLink mobile={lead.mobile} />
        </Typography>
        <Stack direction="row" sx={{ mt: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <StatusSelect
            value={lead.status}
            label={`Status for ${lead.name}`}
            onChange={(status) => onStatusChange?.(lead.id, status)}
            sx={{ flex: 1, minWidth: 0 }}
          />
          {onEdit && <LeadActions lead={lead} onEdit={onEdit} onDelete={onDelete} />}
        </Stack>
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead, onEdit, onDelete, onStatusChange }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  });

  // Only the handle starts a drag, so the dropdown, links and buttons keep working
  // and touch users can still scroll the column.
  const handle = (
    <IconButton
      ref={setActivatorNodeRef}
      size="small"
      aria-label={`Drag ${lead.name}`}
      sx={{ cursor: 'grab', touchAction: 'none', ml: -0.5 }}
      {...attributes}
      {...listeners}
    >
      <DragIndicatorIcon fontSize="small" />
    </IconButton>
  );

  return (
    <div ref={setNodeRef}>
      <LeadCardBody
        lead={lead}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        handle={handle}
        dragging={isDragging}
      />
    </div>
  );
}

export default memo(LeadCard);
