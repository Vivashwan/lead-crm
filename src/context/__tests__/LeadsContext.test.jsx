import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../components/common/NotificationProvider';
import { ValidationError } from '../../domain/validation';
import { sampleLeads } from '../../test/fixtures';

vi.mock('../../services/leadService', async (importOriginal) => {
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

const service = await import('../../services/leadService');
const { LeadsProvider, useLeads } = await import('../LeadsContext');

const wrapper = ({ children }) => (
  <NotificationProvider>
    <LeadsProvider>{children}</LeadsProvider>
  </NotificationProvider>
);

let emit;
let emitError;
const unsubscribe = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  service.subscribeToLeads.mockImplementation((onData, onError) => {
    emit = onData;
    emitError = onError;
    return unsubscribe;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const setup = () => renderHook(() => useLeads(), { wrapper });

describe('LeadsProvider', () => {
  it('starts loading, then exposes live data', () => {
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    act(() => emit(sampleLeads));
    expect(result.current.loading).toBe(false);
    expect(result.current.leads).toHaveLength(4);
    act(() => emit(sampleLeads.slice(0, 1)));
    expect(result.current.leads).toHaveLength(1);
  });

  it('shows a friendly error and retries by re-subscribing', () => {
    const { result } = setup();
    act(() => emitError({ code: 'unavailable' }));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toMatch(/internet/);

    act(() => result.current.retry());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(service.subscribeToLeads).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = setup();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('creates a lead using the current list for duplicate checks and waits for the server', async () => {
    let resolveCommit;
    service.createLead.mockResolvedValue({ id: 'n', committed: new Promise((r) => (resolveCommit = r)) });
    const { result } = setup();
    act(() => emit(sampleLeads));

    let done = false;
    let promise;
    act(() => {
      promise = result.current.createLead({ name: 'X' }).then((r) => ((done = true), r));
    });
    await waitFor(() => expect(service.createLead).toHaveBeenCalledWith({ name: 'X' }, sampleLeads, { offline: false }));
    expect(done).toBe(false);
    resolveCommit();
    await expect(promise).resolves.toEqual({ queued: false });
  });

  it('propagates validation errors to the caller', async () => {
    service.updateLead.mockRejectedValue(new ValidationError({ email: 'dup' }));
    const { result } = setup();
    await expect(result.current.updateLead('a', {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('propagates server failures when online', async () => {
    service.deleteLead.mockImplementation(async () => ({ committed: Promise.reject({ code: 'permission-denied' }) }));
    const { result } = setup();
    await expect(result.current.deleteLead('a')).rejects.toEqual({ code: 'permission-denied' });
  });

  it('does not wait for the server when offline and reports late failures', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    let rejectCommit;
    service.createLead.mockResolvedValue({ id: 'n', committed: new Promise((_, r) => (rejectCommit = r)) });
    const { result } = setup();

    await expect(result.current.createLead({ name: 'X' })).resolves.toEqual({ queued: true });
    expect(service.createLead).toHaveBeenCalledWith({ name: 'X' }, [], { offline: true });
    rejectCommit({ code: 'permission-denied' });
    // Toast is rendered by NotificationProvider; the rejection must not be unhandled.
    await new Promise((r) => setTimeout(r, 0));
  });

  it('changeStatus skips no-op and unknown leads', async () => {
    service.updateLeadStatus.mockResolvedValue({ committed: Promise.resolve() });
    const { result } = setup();
    act(() => emit(sampleLeads));
    await waitFor(() => expect(result.current.leads).toHaveLength(4));

    await result.current.changeStatus('a', 'NEW'); // already NEW
    await result.current.changeStatus('missing', 'WON');
    expect(service.updateLeadStatus).not.toHaveBeenCalled();

    await expect(result.current.changeStatus('a', 'WON')).resolves.toEqual({ queued: false });
    expect(service.updateLeadStatus).toHaveBeenCalledWith('a', 'WON');
  });

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useLeads())).toThrow(/inside LeadsProvider/);
  });
});
