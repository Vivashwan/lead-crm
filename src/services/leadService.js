import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '../config/firebase';
import { LEADS_COLLECTION } from '../constants/leads';
import {
  ValidationError,
  duplicateMessage,
  findDuplicate,
  isValidStatus,
  normalizeLead,
  toStoredMobile,
  sanitizeLead,
  validateLead,
} from '../domain/validation';

const leadsRef = () => collection(getDb(), LEADS_COLLECTION);

const FRIENDLY_ERRORS = {
  'permission-denied': 'The server rejected this change. Please check the lead details.',
  unavailable: 'Cannot reach the server. Check your internet connection and try again.',
  'deadline-exceeded': 'The server took too long to respond. Please try again.',
  'not-found': 'This lead no longer exists. It may have been deleted.',
  'resource-exhausted': 'Too many requests. Please wait a moment and try again.',
};

// Maps Firestore / unknown errors to a message safe to show users.
export function toUserMessage(error) {
  if (error instanceof ValidationError) return Object.values(error.errors)[0] ?? error.message;
  return FRIENDLY_ERRORS[error?.code] ?? 'Something went wrong. Please try again.';
}

// Live subscription to all leads, newest first. Returns an unsubscribe function.
// Every failure, including failing to start, is delivered asynchronously via onError.
export function subscribeToLeads(onData, onError) {
  let q;
  try {
    q = query(leadsRef(), orderBy('createdAt', 'desc'));
  } catch (error) {
    queueMicrotask(() => onError?.(error));
    return () => {};
  }
  return onSnapshot(
    q,
    (snapshot) => {
      // "estimate" fills pending server timestamps so new leads sort correctly immediately.
      onData(snapshot.docs.map((d) => sanitizeLead(d.id, d.data({ serverTimestamps: 'estimate' }))));
    },
    (error) => onError?.(error),
  );
}

// Throws ValidationError if a lead with the same email/mobile exists on the server
// (catches duplicates added by other users that the local list may not have yet).
async function assertNoServerDuplicate(lead, excludeId) {
  for (const field of ['email', 'mobile']) {
    const value = field === 'mobile' ? toStoredMobile(lead.mobile) : lead.email;
    const snap = await getDocs(query(leadsRef(), where(field, '==', value), limit(2)));
    if (snap.docs.some((d) => d.id !== excludeId)) {
      throw new ValidationError({ [field]: duplicateMessage(field) });
    }
  }
}

// Normalizes, validates and checks duplicates. Returns the clean lead or throws ValidationError.
// The server duplicate query is skipped offline (it could only read the local cache).
async function prepareLead(input, existingLeads, excludeId, offline) {
  const lead = normalizeLead(input);
  const { valid, errors } = validateLead(lead);
  if (!valid) throw new ValidationError(errors);

  const duplicate = findDuplicate(lead, existingLeads, excludeId);
  if (duplicate) throw new ValidationError({ [duplicate.field]: duplicateMessage(duplicate.field) });

  if (!offline) await assertNoServerDuplicate(lead, excludeId);
  return lead;
}

// Write functions validate first (rejecting with ValidationError), then
// start the write and return { id?, committed } without waiting for the server. Offline,
// Firestore applies writes locally at once but `committed` only settles after reconnecting,
// so callers decide whether to await it.

export async function createLead(input, existingLeads = [], { offline = false } = {}) {
  const lead = await prepareLead(input, existingLeads, null, offline);
  const ref = doc(leadsRef());
  const committed = setDoc(ref, { ...toStored(lead), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: ref.id, committed };
}

export async function updateLead(id, input, existingLeads = [], { offline = false } = {}) {
  assertId(id);
  const lead = await prepareLead(input, existingLeads, id, offline);
  const committed = updateDoc(leadDoc(id), { ...toStored(lead), updatedAt: serverTimestamp() });
  return { id, committed };
}

export async function updateLeadStatus(id, status) {
  assertId(id);
  if (!isValidStatus(status)) throw new ValidationError({ status: 'Select a valid status' });
  return { id, committed: updateDoc(leadDoc(id), { status, updatedAt: serverTimestamp() }) };
}

export async function deleteLead(id) {
  assertId(id);
  return { id, committed: deleteDoc(leadDoc(id)) };
}

const leadDoc = (id) => doc(getDb(), LEADS_COLLECTION, id);
const toStored = (lead) => ({ ...lead, mobile: toStoredMobile(lead.mobile) });

function assertId(id) {
  if (typeof id !== 'string' || !id.trim() || id.includes('/')) {
    throw new ValidationError({ id: 'Invalid lead id' });
  }
}
