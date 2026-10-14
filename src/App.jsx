import { Suspense, lazy, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { STORAGE_KEYS, VIEW } from './constants/leads';
import { isFirebaseConfigured, missingConfigKeys } from './config/firebase';
import { LeadsProvider, useLeads } from './context/LeadsContext';
import useDebounce from './hooks/useDebounce';
import usePersistentState from './hooks/usePersistentState';
import { toUserMessage } from './services/leadService';
import AppHeader from './components/layout/AppHeader';
import ConfirmDeleteDialog from './components/leads/ConfirmDeleteDialog';
import LeadFormDialog from './components/leads/LeadFormDialog';
import ErrorState from './components/common/ErrorState';
import LoadingState from './components/common/LoadingState';
import SetupRequired from './components/common/SetupRequired';
import { useNotify } from './components/common/NotificationProvider';
import TableView from './components/table/TableView';

// Kanban (and dnd-kit) is downloaded only when that view is first opened.
const KanbanView = lazy(() => import('./components/kanban/KanbanView'));

const isValidView = (v) => Object.values(VIEW).includes(v);

function CrmApp() {
  const { leads, loading, error, retry, createLead, updateLead, deleteLead, changeStatus } = useLeads();
  const notify = useNotify();

  const [view, setView] = usePersistentState(STORAGE_KEYS.VIEW, VIEW.TABLE, isValidView);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  // `key` changes on every open so each dialog starts with fresh state.
  const [form, setForm] = useState({ open: false, lead: null, key: 0 });
  const [toDelete, setToDelete] = useState({ open: false, lead: null, key: 0 });

  const openCreate = useCallback(() => setForm((f) => ({ open: true, lead: null, key: f.key + 1 })), []);
  const openEdit = useCallback((lead) => setForm((f) => ({ open: true, lead, key: f.key + 1 })), []);
  const closeForm = useCallback(() => setForm((f) => ({ ...f, open: false })), []);
  const openDelete = useCallback((lead) => setToDelete((d) => ({ open: true, lead, key: d.key + 1 })), []);
  const closeDelete = useCallback(() => setToDelete((d) => ({ ...d, open: false })), []);

  const handleSubmit = async (values) => {
    const result = form.lead ? await updateLead(form.lead.id, values) : await createLead(values);
    if (result.queued) notify.info('Saved offline — will sync when you are back online');
    else notify.success(form.lead ? 'Lead updated' : 'Lead added');
  };

  const handleDelete = async (lead) => {
    const result = await deleteLead(lead.id);
    notify.success(result.queued ? 'Deleted offline — will sync when you are back online' : 'Lead deleted');
  };

  // Used by the kanban view (drag and dropdown); errors become toasts.
  const handleStatusChange = useCallback(
    async (id, status) => {
      try {
        await changeStatus(id, status);
      } catch (err) {
        notify.error(toUserMessage(err));
      }
    },
    [changeStatus, notify],
  );

  const viewProps = {
    leads,
    search: debouncedSearch,
    onClearSearch: () => setSearch(''),
    onAdd: openCreate,
    onEdit: openEdit,
    onDelete: openDelete,
    onStatusChange: handleStatusChange,
  };

  let content;
  if (loading) content = <LoadingState />;
  else if (error) content = <ErrorState message={error} onRetry={retry} />;
  else if (view === VIEW.KANBAN)
    content = (
      <Suspense fallback={<LoadingState />}>
        <KanbanView {...viewProps} />
      </Suspense>
    );
  else content = <TableView {...viewProps} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader search={search} onSearchChange={setSearch} view={view} onViewChange={setView} onAdd={openCreate} />
      <Container component="main" maxWidth={view === VIEW.KANBAN ? false : 'xl'} sx={{ py: 2, pb: { xs: 10, sm: 3 } }}>
        {content}
      </Container>
      <LeadFormDialog key={`form-${form.key}`} open={form.open} lead={form.lead} onClose={closeForm} onSubmit={handleSubmit} />
      <ConfirmDeleteDialog
        key={`delete-${toDelete.key}`}
        open={toDelete.open}
        lead={toDelete.lead}
        onClose={closeDelete}
        onConfirm={handleDelete}
      />
    </Box>
  );
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupRequired missingKeys={missingConfigKeys} />;
  return (
    <LeadsProvider>
      <CrmApp />
    </LeadsProvider>
  );
}
