import { PRIORITY_META, STATUS_LIST, STATUS_META } from '../constants/leads';

export const EMPTY_FILTERS = Object.freeze({ name: '', email: '', mobile: '', status: [], priority: [] });

const lower = (value) => String(value ?? '').toLowerCase();
const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

// Mobile matches the digits typed, ignoring spaces or dashes in the search ("98765 43210" finds "9876543210").
function mobileMatches(mobile, term) {
  if (lower(mobile).includes(term)) return true;
  const digits = digitsOnly(term);
  return digits.length > 0 && digitsOnly(mobile).includes(digits);
}

// Global search across every column (statuses/priorities by their labels).
export function matchesSearch(lead, search) {
  const term = lower(search).trim();
  if (!term) return true;
  return (
    lower(lead.name).includes(term) ||
    lower(lead.email).includes(term) ||
    mobileMatches(lead.mobile, term) ||
    lower(STATUS_META[lead.status]?.label).includes(term) ||
    lower(PRIORITY_META[lead.priority]?.label).includes(term)
  );
}

// Per-column filters: text "contains" for name/email/mobile, multi-select for enums.
export function matchesFilters(lead, filters = EMPTY_FILTERS) {
  const name = lower(filters.name).trim();
  const email = lower(filters.email).trim();
  const mobile = lower(filters.mobile).trim();
  if (name && !lower(lead.name).includes(name)) return false;
  if (email && !lower(lead.email).includes(email)) return false;
  if (mobile && !mobileMatches(lead.mobile, mobile)) return false;
  if (filters.status?.length && !filters.status.includes(lead.status)) return false;
  if (filters.priority?.length && !filters.priority.includes(lead.priority)) return false;
  return true;
}

export const hasActiveFilters = (filters = EMPTY_FILTERS) =>
  Boolean(
    filters.name?.trim() ||
      filters.email?.trim() ||
      filters.mobile?.trim() ||
      filters.status?.length ||
      filters.priority?.length,
  );

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

const comparators = {
  name: (a, b) => collator.compare(a.name, b.name),
  email: (a, b) => collator.compare(a.email, b.email),
  mobile: (a, b) => {
    const x = digitsOnly(a.mobile);
    const y = digitsOnly(b.mobile);
    return x < y ? -1 : x > y ? 1 : 0;
  },
  status: (a, b) => (STATUS_META[a.status]?.order ?? 0) - (STATUS_META[b.status]?.order ?? 0),
  priority: (a, b) => (PRIORITY_META[a.priority]?.order ?? 0) - (PRIORITY_META[b.priority]?.order ?? 0),
  createdAt: (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
  updatedAt: (a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
};

export const SORTABLE_FIELDS = Object.freeze(Object.keys(comparators));

// Returns a new sorted array. Ties fall back to newest first, then id, so order is stable.
export function sortLeads(leads, sort = {}) {
  const compare = comparators[sort.field] ?? comparators.createdAt;
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...leads].sort(
    (a, b) =>
      compare(a, b) * dir || (b.createdAt ?? 0) - (a.createdAt ?? 0) || String(a.id).localeCompare(String(b.id)),
  );
}

// Clamps page into range so deleting/filtering never leaves an empty page.
export function paginate(items, page = 0, pageSize = 10) {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(0, Number.isInteger(page) ? page : 0), totalPages - 1);
  const start = current * size;
  return { items: items.slice(start, start + size), page: current, pageSize: size, total, totalPages };
}

// search → column filters → sort (table pipeline, before pagination).
export function queryLeads(leads, { search = '', filters = EMPTY_FILTERS, sort } = {}) {
  const filtered = leads.filter((lead) => matchesSearch(lead, search) && matchesFilters(lead, filters));
  return sortLeads(filtered, sort);
}

// Kanban: one bucket per status, each sorted by priority (urgent first), then newest.
export function groupByStatus(leads) {
  const groups = Object.fromEntries(STATUS_LIST.map((status) => [status, []]));
  for (const lead of leads) (groups[lead.status] ?? groups[STATUS_LIST[0]]).push(lead);
  for (const status of STATUS_LIST) groups[status] = sortLeads(groups[status], { field: 'priority', direction: 'desc' });
  return groups;
}
