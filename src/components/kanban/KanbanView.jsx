import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { STATUS_LIST, STATUS_META } from '../../constants/leads';
import { groupByStatus, matchesSearch } from '../../domain/query';
import EmptyState from '../common/EmptyState';
import KanbanColumn from './KanbanColumn';
import { LeadCardBody } from './LeadCard';

const announcements = (leadsById) => {
  const name = (id) => leadsById.get(id)?.name ?? 'lead';
  const column = (over) => (over ? STATUS_META[over.id]?.label : null);
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over ${column(over)}.` : `${name(active.id)} is not over a column.`),
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} moved to ${column(over)}.` : `${name(active.id)} was dropped.`),
    onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
  };
};

export default function KanbanView({ leads, search, onClearSearch, onAdd, onEdit, onDelete, onStatusChange }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const visible = useMemo(() => leads.filter((lead) => matchesSearch(lead, search)), [leads, search]);
  const columns = useMemo(() => groupByStatus(visible), [visible]);
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const activeLead = activeId ? leadsById.get(activeId) : null;

  // Moves the lead only when dropped on a different column.
  const handleDragEnd = useCallback(
    ({ active, over }) => {
      setActiveId(null);
      if (!over || over.id === active.data.current?.status) return;
      onStatusChange(active.id, over.id);
    },
    [onStatusChange],
  );

  if (leads.length === 0) {
    return <EmptyState title="No leads yet" message="Add your first lead to get started." actionLabel="Add lead" onAction={onAdd} />;
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} aria-live="polite">
        {visible.length === leads.length ? `${leads.length} leads` : `${visible.length} of ${leads.length} leads`}
        {visible.length === 0 && (
          <Button size="small" onClick={onClearSearch} sx={{ ml: 1 }}>
            Clear search
          </Button>
        )}
      </Typography>
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{ announcements: announcements(leadsById) }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            scrollSnapType: { xs: 'x mandatory', sm: 'none' },
            alignItems: 'flex-start',
          }}
        >
          {STATUS_LIST.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={columns[status]}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </Box>
        <DragOverlay dropAnimation={null}>
          {activeLead ? <LeadCardBody lead={activeLead} handle={null} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
