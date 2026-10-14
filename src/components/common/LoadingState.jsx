import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export default function LoadingState({ rows = 5 }) {
  return (
    <Box role="status" aria-label="Loading leads" sx={{ p: 2 }}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}
