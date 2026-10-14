import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import { VIEW } from '../../constants/leads';

export default function ViewToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_event, next) => next && onChange(next)}
      aria-label="Choose view"
    >
      <ToggleButton value={VIEW.TABLE} aria-label="Table view">
        <TableRowsOutlinedIcon fontSize="small" />
        <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', md: 'inline' } }}>
          Table
        </Box>
      </ToggleButton>
      <ToggleButton value={VIEW.KANBAN} aria-label="Kanban view">
        <ViewKanbanOutlinedIcon fontSize="small" />
        <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', md: 'inline' } }}>
          Kanban
        </Box>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
