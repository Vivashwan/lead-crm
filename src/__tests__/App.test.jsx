import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../components/common/NotificationProvider';
import { STORAGE_KEYS } from '../constants/leads';
import { ValidationError } from '../domain/validation';
import { sampleLeads } from '../test/fixtures';

const config = vi.hoisted(() => ({ isFirebaseConfigured: true, missingConfigKeys: [] }));
vi.mock('../config/firebase', () => config);

vi.mock('../services/leadService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    toUserMessage: actual.toUserMessage,
    subscribeToLeads: vi.fn(),
    createLead: vi.fn(),
    updateLead: vi.fn(),
    updateLeadStatus: vi.fn(),
    deleteLead: vi.fn(),
  };
});

const service = await import('../services/leadService');
const { default: App } = await import('../App');

let emit;
let emitError;

beforeEach(() => {
  vi.clearAllMocks();
  config.isFirebaseConfigured = true;
  service.subscribeToLeads.mockImplementation((onData, onError) => {
    emit = onData;
    emitError = onError;
    return () => {};
  });
});

const renderApp = () => {
  render(
    <NotificationProvider>
      <App />
    </NotificationProvider>,
  );
  return userEvent.setup();
};

const loaded = (leads = sampleLeads) => act(() => emit(leads));

describe('App', () => {
  it('shows the setup screen when Firebase is not configured', () => {
    config.isFirebaseConfigured = false;
    config.missingConfigKeys = ['apiKey'];
    renderApp();
    expect(screen.getByText(/firebase is not configured/i)).toBeInTheDocument();
    expect(service.subscribeToLeads).not.toHaveBeenCalled();
  });

  it('shows loading, then the table', () => {
    renderApp();
    expect(screen.getByRole('status', { name: 'Loading leads' })).toBeInTheDocument();
    loaded();
    expect(screen.getByRole('table', { name: 'Leads' })).toBeInTheDocument();
  });

  it('shows a load error with retry', async () => {
    const user = renderApp();
    act(() => emitError({ code: 'unavailable' }));
    expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(service.subscribeToLeads).toHaveBeenCalledTimes(2);
  });

  it('filters the table from the header search (debounced)', async () => {
    const user = renderApp();
    loaded();
    await user.type(screen.getByRole('searchbox', { name: 'Search leads' }), 'bharat');
    await waitFor(() => expect(screen.getByText('1 of 4 leads')).toBeInTheDocument());
  });

  it('adds a lead end to end and confirms with a toast', async () => {
    service.createLead.mockResolvedValue({ id: 'n', committed: Promise.resolve() });
    const user = renderApp();
    loaded();
    await user.click(screen.getAllByRole('button', { name: 'Add lead' })[0]);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', { name: /^name/i }), 'New Person');
    await user.type(within(dialog).getByRole('textbox', { name: /^email/i }), 'new@person.com');
    await user.type(within(dialog).getByRole('textbox', { name: /^mobile/i }), '9000000001');
    await user.click(within(dialog).getByRole('button', { name: 'Add lead' }));

    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Person', email: 'new@person.com' }),
      sampleLeads,
      { offline: false },
    );
    expect(await screen.findByText('Lead added')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the form open with the duplicate error', async () => {
    service.updateLead.mockRejectedValue(new ValidationError({ mobile: 'A lead with this mobile number already exists' }));
    const user = renderApp();
    loaded();
    await user.click(screen.getByRole('button', { name: 'Edit Asha Rao' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('A lead with this mobile number already exists')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(service.updateLead).toHaveBeenCalledWith('a', expect.objectContaining({ name: 'Asha Rao' }), sampleLeads, {
      offline: false,
    });
  });

  it('deletes after confirmation', async () => {
    service.deleteLead.mockResolvedValue({ committed: Promise.resolve() });
    const user = renderApp();
    loaded();
    await user.click(screen.getByRole('button', { name: 'Delete Chen Li' }));
    expect(service.deleteLead).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(service.deleteLead).toHaveBeenCalledWith('c');
    expect(await screen.findByText('Lead deleted')).toBeInTheDocument();
  });

  it('lazy-loads the kanban view and remembers it across reloads', async () => {
    const user = renderApp();
    loaded();
    await user.click(screen.getByRole('button', { name: 'Kanban view' }));
    expect(await screen.findByRole('region', { name: 'New column' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.VIEW)).toBe('"kanban"');
  });

  it('opens straight into the remembered kanban view', async () => {
    localStorage.setItem(STORAGE_KEYS.VIEW, '"kanban"');
    renderApp();
    loaded();
    expect(await screen.findByRole('region', { name: 'Won column' })).toBeInTheDocument();
  });

  it('changes status from kanban and shows a toast if the server rejects it', async () => {
    service.updateLeadStatus.mockImplementation(async () => ({ committed: Promise.reject({ code: 'permission-denied' }) }));
    localStorage.setItem(STORAGE_KEYS.VIEW, '"kanban"');
    const user = renderApp();
    loaded();
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Status for Asha Rao' }), 'WON');
    expect(service.updateLeadStatus).toHaveBeenCalledWith('a', 'WON');
    expect(await screen.findByText(/server rejected/i)).toBeInTheDocument();
  });
});
