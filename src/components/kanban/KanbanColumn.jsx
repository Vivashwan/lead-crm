import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { STATUS_META } from '../../constants/leads';
import LeadCard from './LeadCard';

function KanbanColumn({ status, leads, onEdit, onDelete, onStatusChange }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <Paper
      ref={setNodeRef}
      component="section"
      aria-label={`${meta.label} column`}
      variant="outlined"
      sx={{
        flex: '0 0 auto',
        width: { xs: '85vw', sm: 300 },
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isOver ? 'action.hover' : 'grey.50',
        borderColor: isOver ? 'primary.main' : 'divider',
        borderTop: 3,
        borderTopColor: `${meta.color === 'default' ? 'grey' : meta.color}.main`,
        transition: 'background-color 120ms',
      }}
    >
      <Stack direction="row" sx={{ px: 1.5, py: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography component="h2" sx={{ fontWeight: 600 }}>
          {meta.label}
        </Typography>
        <Chip size="small" label={leads.length} aria-label={`${leads.length} leads`} />
      </Stack>
      <Stack spacing={1} sx={{ px: 1, pb: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 210px)', minHeight: 120 }}>
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))}
        {leads.length === 0 && (
          <Box
            sx={{
              border: 1,
              borderStyle: 'dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              textAlign: 'center',
              color: 'text.secondary',
              typography: 'body2',
            }}
          >
            Drop leads here
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export default memo(KanbanColumn);
