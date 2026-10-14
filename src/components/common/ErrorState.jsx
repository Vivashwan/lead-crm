import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export default function ErrorState({ message, onRetry }) {
  return (
    <Alert
      severity="error"
      sx={{ m: 2 }}
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}
