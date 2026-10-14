import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Fab from '@mui/material/Fab';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import SearchField from './SearchField';
import ViewToggle from './ViewToggle';

// Desktop: one row. Phone: search wraps to a full-width second row, "Add" becomes a FAB.
export default function AppHeader({ search, onSearchChange, view, onViewChange, onAdd }) {
  return (
    <>
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1.5, py: 1 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, mr: 'auto' }}>
            Lead CRM
          </Typography>
          <SearchField
            value={search}
            onChange={onSearchChange}
            sx={{ order: { xs: 3, sm: 0 }, width: { xs: '100%', sm: 280, md: 360 } }}
          />
          <ViewToggle value={view} onChange={onViewChange} />
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
              Add lead
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Fab
        color="primary"
        aria-label="Add lead"
        onClick={onAdd}
        sx={{ position: 'fixed', right: 16, bottom: 16, display: { xs: 'flex', sm: 'none' }, zIndex: 'speedDial' }}
      >
        <AddIcon />
      </Fab>
    </>
  );
}
