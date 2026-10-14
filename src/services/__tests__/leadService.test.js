import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/firebase', () => ({ getDb: vi.fn(() => ({ __db: true })) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'leadsRef'),
  // doc(collectionRef) → new auto-id ref; doc(db, col, id) → path string
  doc: vi.fn((first, col, id) => (col ? `${col}/${id}` : { id: 'new-id', parent: first })),
  query: vi.fn((...args) => ({ args })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

const fs = await import('firebase/firestore');
const service = await import('../leadService');
const { ValidationError } = await import('../../domain/validation');

const input = { name: ' Asha Rao ', email: 'ASHA@acme.com', mobile: ' 9876543210 ', status: 'NEW', priority: 'HIGH' };
// What Firestore receives: mobile as an integer.
const stored = { name: 'Asha Rao', email: 'asha@acme.com', mobile: 9876543210, status: 'NEW', priority: 'HIGH' };
const emptySnap = { docs: [] };

beforeEach(() => {
  vi.clearAllMocks();
  fs.getDocs.mockResolvedValue(emptySnap);
  fs.setDoc.mockResolvedValue();
  fs.updateDoc.mockResolvedValue();
  fs.deleteDoc.mockResolvedValue();
});

describe('subscribeToLeads', () => {
  it('maps snapshot docs through sanitizeLead and estimates pending timestamps', () => {
    const unsubscribe = vi.fn();
    fs.onSnapshot.mockImplementation((_q, onNext) => {
      const data = vi.fn(() => ({ ...stored, status: 'GARBAGE' }));
      onNext({ docs: [{ id: 'x1', data }] });
      expect(data).toHaveBeenCalledWith({ serverTimestamps: 'estimate' });
      return unsubscribe;
    });
    const onData = vi.fn();
    expect(service.subscribeToLeads(onData, vi.fn())).toBe(unsubscribe);
    expect(onData).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'x1', status: 'NEW', name: 'Asha Rao', mobile: '9876543210' }),
    ]);
  });

  it('reports a failure to start the listener asynchronously', async () => {
    fs.query.mockImplementationOnce(() => {
      throw new Error('not configured');
    });
    const onError = vi.fn();
    const unsubscribe = service.subscribeToLeads(vi.fn(), onError);
    expect(onError).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(() => unsubscribe()).not.toThrow();
  });

  it('forwards listener errors', () => {
    const err = { code: 'unavailable' };
    fs.onSnapshot.mockImplementation((_q, _next, onErr) => onErr(err));
    const onError = vi.fn();
    service.subscribeToLeads(vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe('createLead', () => {
  it('normalizes and writes with server timestamps, returning the commit promise', async () => {
    const result = await service.createLead(input, []);
    expect(result.id).toBe('new-id');
    await expect(result.committed).resolves.toBeUndefined();
    expect(fs.setDoc).toHaveBeenCalledWith(
      { id: 'new-id', parent: 'leadsRef' },
      { ...stored, createdAt: 'SERVER_TS', updatedAt: 'SERVER_TS' },
    );
    expect(fs.getDocs).toHaveBeenCalledTimes(2);
  });

  it('skips the server duplicate query when offline', async () => {
    await service.createLead(input, [], { offline: true });
    expect(fs.getDocs).not.toHaveBeenCalled();
    expect(fs.setDoc).toHaveBeenCalled();
  });

  it('does not wait for the server to confirm the write', async () => {
    fs.setDoc.mockReturnValue(new Promise(() => {})); // never settles, like offline
    const result = await service.createLead(input, [], { offline: true });
    expect(result.id).toBe('new-id');
  });

  it('rejects a non-numeric or wrong-length mobile without touching Firestore', async () => {
    for (const mobile of ['98765-43210', '987654321', '+919876543210']) {
      const err = await service.createLead({ ...input, mobile }, []).catch((e) => e);
      expect(err.errors.mobile).toBeDefined();
    }
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it('rejects invalid data without touching Firestore', async () => {
    const err = await service.createLead({ ...input, email: 'bad' }, []).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.errors.email).toMatch(/valid email/);
    expect(fs.getDocs).not.toHaveBeenCalled();
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it('blocks duplicates found in the local list', async () => {
    const err = await service.createLead(input, [{ id: 'o', email: 'asha@acme.com', mobile: '1' }]).catch((e) => e);
    expect(err.errors).toEqual({ email: 'A lead with this email already exists' });
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it('blocks duplicates found on the server', async () => {
    fs.getDocs.mockImplementation(async (q) =>
      q.args[1].field === 'mobile' ? { docs: [{ id: 'other' }] } : emptySnap,
    );
    const err = await service.createLead(input, []).catch((e) => e);
    expect(err.errors).toEqual({ mobile: 'A lead with this mobile number already exists' });
    expect(fs.where).toHaveBeenCalledWith('mobile', '==', 9876543210);
    expect(fs.setDoc).not.toHaveBeenCalled();
  });
});

describe('updateLead', () => {
  it('updates fields and updatedAt only (createdAt preserved)', async () => {
    const { committed } = await service.updateLead('id1', input, []);
    await committed;
    expect(fs.updateDoc).toHaveBeenCalledWith('leads/id1', { ...stored, updatedAt: 'SERVER_TS' });
  });

  it('allows keeping its own email/mobile', async () => {
    fs.getDocs.mockResolvedValue({ docs: [{ id: 'id1' }] });
    await expect(service.updateLead('id1', input, [{ id: 'id1', ...stored }])).resolves.toMatchObject({ id: 'id1' });
  });

  it('rejects invalid ids', async () => {
    for (const bad of ['', '  ', null, 'a/b', 42]) {
      await expect(service.updateLead(bad, input, [])).rejects.toBeInstanceOf(ValidationError);
    }
    expect(fs.updateDoc).not.toHaveBeenCalled();
  });
});

describe('updateLeadStatus / deleteLead', () => {
  it('updates status', async () => {
    await service.updateLeadStatus('id1', 'WON');
    expect(fs.updateDoc).toHaveBeenCalledWith('leads/id1', { status: 'WON', updatedAt: 'SERVER_TS' });
  });

  it('rejects an invalid status', async () => {
    await expect(service.updateLeadStatus('id1', 'BOGUS')).rejects.toBeInstanceOf(ValidationError);
    expect(fs.updateDoc).not.toHaveBeenCalled();
  });

  it('deletes by id and validates it', async () => {
    await service.deleteLead('id1');
    expect(fs.deleteDoc).toHaveBeenCalledWith('leads/id1');
    await expect(service.deleteLead('')).rejects.toBeInstanceOf(ValidationError);
  });

  it('propagates Firestore errors', async () => {
    fs.deleteDoc.mockRejectedValueOnce({ code: 'permission-denied' });
    const { committed } = await service.deleteLead('id1');
    await expect(committed).rejects.toEqual({ code: 'permission-denied' });
  });
});

describe('toUserMessage', () => {
  it('maps known codes, validation errors and unknown errors', () => {
    expect(service.toUserMessage({ code: 'unavailable' })).toMatch(/internet/);
    expect(service.toUserMessage(new ValidationError({ email: 'dup' }))).toBe('dup');
    expect(service.toUserMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(service.toUserMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
