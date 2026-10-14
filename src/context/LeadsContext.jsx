import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as leadService from '../services/leadService';
import { useNotify } from '../components/common/NotificationProvider';

const LeadsContext = createContext(null);

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export function LeadsProvider({ children }) {
  const notify = useNotify();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  // Latest list for duplicate checks without re-creating action callbacks.
  const leadsRef = useRef(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(
    () =>
      leadService.subscribeToLeads(
        (data) => {
          setLeads(data);
          setError(null);
          setLoading(false);
        },
        (err) => {
          setError(leadService.toUserMessage(err));
          setLoading(false);
        },
      ),
    [attempt],
  );

  // Online: wait for the server so failures surface to the caller.
  // Offline: the change is already applied locally; report later failures as a toast.
  const settle = useCallback(
    async ({ committed }) => {
      if (isOffline()) {
        committed.catch((err) => notify.error(leadService.toUserMessage(err)));
        return { queued: true };
      }
      await committed;
      return { queued: false };
    },
    [notify],
  );

  const createLead = useCallback(
    async (input) => settle(await leadService.createLead(input, leadsRef.current, { offline: isOffline() })),
    [settle],
  );

  const updateLead = useCallback(
    async (id, input) => settle(await leadService.updateLead(id, input, leadsRef.current, { offline: isOffline() })),
    [settle],
  );

  const changeStatus = useCallback(
    async (id, status) => {
      const current = leadsRef.current.find((lead) => lead.id === id);
      if (!current || current.status === status) return { queued: false };
      return settle(await leadService.updateLeadStatus(id, status));
    },
    [settle],
  );

  const deleteLead = useCallback(async (id) => settle(await leadService.deleteLead(id)), [settle]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ leads, loading, error, createLead, updateLead, changeStatus, deleteLead, retry }),
    [leads, loading, error, createLead, updateLead, changeStatus, deleteLead, retry],
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be used inside LeadsProvider');
  return ctx;
}
