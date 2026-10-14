import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

const NotificationContext = createContext(null);

let nextId = 0;

// Queues toasts and shows one at a time.
export function NotificationProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const current = queue[0];

  const push = useCallback((severity, message) => {
    setQueue((q) => [...q, { id: ++nextId, severity, message }]);
  }, []);

  const notify = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  const handleClose = (_event, reason) => {
    if (reason === 'clickaway') return;
    setQueue((q) => q.slice(1));
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        key={current?.id}
        open={Boolean(current)}
        autoHideDuration={current?.severity === 'error' ? 6000 : 3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert onClose={handleClose} severity={current.severity} variant="filled" sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used inside NotificationProvider');
  return ctx;
}
