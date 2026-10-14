// Single source of truth for lead enums. Used by validation, table, kanban,
// form dropdowns and mirrored in firestore.rules.

export const LEADS_COLLECTION = 'leads';

export const STATUS = Object.freeze({
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  WON: 'WON',
  LOST: 'LOST',
});

// Order defines kanban column order and status sort order.
export const STATUS_META = Object.freeze({
  [STATUS.NEW]: { label: 'New', order: 0, color: 'info' },
  [STATUS.CONTACTED]: { label: 'Contacted', order: 1, color: 'primary' },
  [STATUS.QUALIFIED]: { label: 'Qualified', order: 2, color: 'secondary' },
  [STATUS.PROPOSAL]: { label: 'Proposal', order: 3, color: 'warning' },
  [STATUS.WON]: { label: 'Won', order: 4, color: 'success' },
  [STATUS.LOST]: { label: 'Lost', order: 5, color: 'error' },
});

export const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
});

export const PRIORITY_META = Object.freeze({
  [PRIORITY.LOW]: { label: 'Low', order: 0, color: 'default' },
  [PRIORITY.MEDIUM]: { label: 'Medium', order: 1, color: 'info' },
  [PRIORITY.HIGH]: { label: 'High', order: 2, color: 'warning' },
  [PRIORITY.URGENT]: { label: 'Urgent', order: 3, color: 'error' },
});

export const STATUS_LIST = Object.freeze(
  Object.values(STATUS).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order),
);
export const PRIORITY_LIST = Object.freeze(
  Object.values(PRIORITY).sort((a, b) => PRIORITY_META[a].order - PRIORITY_META[b].order),
);

export const DEFAULT_STATUS = STATUS.NEW;
export const DEFAULT_PRIORITY = PRIORITY.MEDIUM;

// Field constraints (kept in sync with firestore.rules).
export const LIMITS = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  MOBILE_LENGTH: 10,
});

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Mobile: exactly 10 digits, first digit 1–9 (it is stored as a number, so a
// leading 0 would be lost). Firestore range: 1000000000–9999999999.
export const MOBILE_REGEX = /^[1-9]\d{9}$/;

export const LEAD_FIELDS = Object.freeze(['name', 'email', 'mobile', 'status', 'priority']);

// Table columns: all searchable and sortable.
export const COLUMNS = Object.freeze([
  { id: 'name', label: 'Name', filter: 'text' },
  { id: 'email', label: 'Email', filter: 'text' },
  { id: 'mobile', label: 'Mobile', filter: 'text' },
  { id: 'status', label: 'Status', filter: 'select' },
  { id: 'priority', label: 'Priority', filter: 'select' },
]);

export const VIEW = Object.freeze({ TABLE: 'table', KANBAN: 'kanban' });

export const PAGE_SIZE_OPTIONS = Object.freeze([10, 25, 50]);
export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;

export const DEFAULT_SORT = Object.freeze({ field: 'createdAt', direction: 'desc' });

// localStorage keys for UI preferences (data itself lives in Firestore).
export const STORAGE_KEYS = Object.freeze({
  VIEW: 'leadcrm.view',
  SORT: 'leadcrm.sort',
  PAGE_SIZE: 'leadcrm.pageSize',
});
