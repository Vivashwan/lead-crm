import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  EMAIL_REGEX,
  LIMITS,
  MOBILE_REGEX,
  PRIORITY_META,
  STATUS_META,
} from '../constants/leads';

export class ValidationError extends Error {
  constructor(errors) {
    super('Lead data is invalid');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const asString = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');

export const normalizeEmail = (value) => asString(value).trim().toLowerCase();

// Form value as typed (trimmed). Accepts the stored number too, so "9876543210" === 9876543210.
export const normalizeMobile = (value) => asString(value).trim();

// Firestore stores the mobile as an integer.
export const toStoredMobile = (mobile) => Number(mobile);

export const isValidStatus = (value) => Object.hasOwn(STATUS_META, value);
export const isValidPriority = (value) => Object.hasOwn(PRIORITY_META, value);

// Converts raw form input into the shape stored in Firestore.
export function normalizeLead(input = {}) {
  const source = input ?? {};
  return {
    name: asString(source.name).trim().replace(/\s+/g, ' '),
    email: normalizeEmail(source.email),
    mobile: normalizeMobile(source.mobile),
    status: asString(source.status).trim().toUpperCase(),
    priority: asString(source.priority).trim().toUpperCase(),
  };
}

// Validates a normalized lead. Returns { valid, errors } where errors maps field → message.
export function validateLead(lead) {
  const errors = {};
  const { name, email, mobile, status, priority } = lead ?? {};

  if (!name) errors.name = 'Name is required';
  else if (name.length < LIMITS.NAME_MIN) errors.name = `Name must be at least ${LIMITS.NAME_MIN} characters`;
  else if (name.length > LIMITS.NAME_MAX) errors.name = `Name must be at most ${LIMITS.NAME_MAX} characters`;

  if (!email) errors.email = 'Email is required';
  else if (email.length > LIMITS.EMAIL_MAX) errors.email = `Email must be at most ${LIMITS.EMAIL_MAX} characters`;
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Enter a valid email address';

  if (!mobile) errors.mobile = 'Mobile number is required';
  else if (!/^\d+$/.test(mobile)) errors.mobile = 'Mobile number must contain digits only';
  else if (mobile.length !== LIMITS.MOBILE_LENGTH)
    errors.mobile = `Mobile number must be exactly ${LIMITS.MOBILE_LENGTH} digits`;
  else if (!MOBILE_REGEX.test(mobile)) errors.mobile = 'Mobile number cannot start with 0';

  if (!status) errors.status = 'Status is required';
  else if (!isValidStatus(status)) errors.status = 'Select a valid status';

  if (!priority) errors.priority = 'Priority is required';
  else if (!isValidPriority(priority)) errors.priority = 'Select a valid priority';

  return { valid: Object.keys(errors).length === 0, errors };
}

// Returns { field, lead } for the first existing lead sharing email or mobile, else null.
// `excludeId` skips the lead being edited.
export function findDuplicate(lead, existingLeads = [], excludeId = null) {
  const email = normalizeEmail(lead?.email);
  const mobile = normalizeMobile(lead?.mobile);
  for (const other of existingLeads) {
    if (!other || other.id === excludeId) continue;
    if (email && normalizeEmail(other.email) === email) return { field: 'email', lead: other };
    if (mobile && normalizeMobile(other.mobile) === mobile) return { field: 'mobile', lead: other };
  }
  return null;
}

export const duplicateMessage = (field) =>
  field === 'email' ? 'A lead with this email already exists' : 'A lead with this mobile number already exists';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

// Makes a Firestore document safe to render: never throws, fills fallbacks for
// missing/invalid fields so one bad document cannot break the views.
export function sanitizeLead(id, data) {
  const raw = data && typeof data === 'object' ? data : {};
  return {
    id: String(id),
    name: asString(raw.name).trim() || 'Unnamed lead',
    email: asString(raw.email).trim(),
    mobile: asString(raw.mobile).trim(),
    status: isValidStatus(raw.status) ? raw.status : DEFAULT_STATUS,
    priority: isValidPriority(raw.priority) ? raw.priority : DEFAULT_PRIORITY,
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}
