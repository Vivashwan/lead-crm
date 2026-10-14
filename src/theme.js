import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#2f5bea' }, background: { default: '#f5f7fb' } },
  shape: { borderRadius: 10 },
  typography: { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
});

export default theme;
