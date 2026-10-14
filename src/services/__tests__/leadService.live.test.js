// @vitest-environment node
// Runs the real service against the Firestore project in .env.
// Not part of `npm test`; run with `npm run test:live`. Cleans up after itself.
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/firebase', async () => {
  const { initializeApp } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');
  const env = import.meta.env;
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const db = getFirestore(app); // memory cache: IndexedDB is not available in Node
  return { getDb: () => db, isFirebaseConfigured: true, missingConfigKeys: [] };
});

const service = await import('../leadService');
const { ValidationError } = await import('../../domain/validation');

const stamp = Date.now();
const input = {
  name: `Live Test ${stamp}`,
  email: `live.${stamp}@example.com`,
  mobile: `9${String(stamp).slice(-9)}`,
  status: 'NEW',
  priority: 'LOW',
};
const created = [];

afterAll(async () => {
  for (const id of created) {
    try {
      await (await service.deleteLead(id)).committed;
    } catch {
      // already deleted by the test
    }
  }
});

function nextSnapshot(predicate) {
  return new Promise((resolve, reject) => {
    const unsubscribe = service.subscribeToLeads((leads) => {
      if (predicate(leads)) {
        unsubscribe();
        resolve(leads);
      }
    }, reject);
  });
}

describe('leadService against live Firestore', { timeout: 30000 }, () => {
  let id;

  it('creates a lead and sees it through the live subscription', async () => {
    const result = await service.createLead(input, []);
    id = result.id;
    created.push(id);
    await result.committed;
    const leads = await nextSnapshot((list) => list.some((l) => l.id === id));
    expect(leads.find((l) => l.id === id)).toMatchObject({
      name: input.name,
      email: input.email,
      mobile: input.mobile, // stored as a number, read back as text for display
      status: 'NEW',
    });
  });

  it('blocks a duplicate found only on the server', async () => {
    const err = await service.createLead({ ...input, mobile: '5550000000' }, []).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.errors.email).toMatch(/already exists/);
  });

  it('updates the lead (own email/mobile allowed) and changes status', async () => {
    await (await service.updateLead(id, { ...input, priority: 'URGENT' }, [])).committed;
    await (await service.updateLeadStatus(id, 'WON')).committed;
    const leads = await nextSnapshot((list) => list.find((l) => l.id === id)?.status === 'WON');
    const lead = leads.find((l) => l.id === id);
    expect(lead).toMatchObject({ priority: 'URGENT', status: 'WON' });
    expect(lead.updatedAt).toBeGreaterThanOrEqual(lead.createdAt);
  });

  it('deletes the lead', async () => {
    await (await service.deleteLead(id)).committed;
    await nextSnapshot((list) => !list.some((l) => l.id === id));
  });
});
