import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Container from '@mui/material/Container';

export default function SetupRequired({ missingKeys = [] }) {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Alert severity="warning">
        <AlertTitle>Firebase is not configured</AlertTitle>
        Copy <code>.env.example</code> to <code>.env</code>, fill in your Firebase web config and restart the dev
        server.
        {missingKeys.length > 0 && <> Missing: {missingKeys.join(', ')}.</>}
      </Alert>
    </Container>
  );
}
