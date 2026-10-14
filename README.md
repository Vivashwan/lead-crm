# Lead CRM

A small CRM for managing sales leads, with a **table view** and a **Kanban board**, backed by Cloud Firestore.

- Leads have name, email, mobile, status and priority (status and priority are fixed enums)
- Full create / edit / delete (delete asks for confirmation), with validation and duplicate blocking (same email or mobile)
- Table: global search, per-column search and sorting on every column, paging (10 / 25 / 50)
- Kanban: one column per status; change status by drag and drop or the card's dropdown
- Live sync across tabs and users; data survives reloads and keeps working offline
- Responsive: table turns into cards on phones, Kanban scrolls column by column

**Stack:** React 19 · Vite 8 · Material UI 9 · Firebase 13 (Firestore) · dnd-kit · Vitest + React Testing Library

## Getting started

Requires Node 20+.

```bash
npm install
cp .env.example .env    # then fill in your Firebase web app config
npm run dev
```

### Firebase setup

1. Create a project at https://console.firebase.google.com
2. **Build → Firestore Database → Create database** (production mode, pick a region)
3. **Project settings → Your apps → Web (`</>`)** → register an app and copy the config values into `.env`
4. Publish the security rules: paste `firestore.rules` into **Firestore → Rules → Publish**,
   or run `npx firebase-tools deploy --only firestore:rules`

If `.env` is incomplete the app shows a setup screen listing the missing keys.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run preview` | Production build / serve it locally |
| `npm test` | Run the test suite (Firebase is mocked; no network) |
| `npm run test:coverage` | Tests with a coverage report |
| `npm run test:live` | Run the data service against the real Firestore in `.env` (creates and deletes one test lead) |
| `npm run lint` | ESLint |

## Architecture

```
components ──▶ LeadsContext (useLeads) ──▶ leadService ──▶ Firestore
     │                                         │
     └──────────────▶ domain/ (pure validation, search, sort, paging) ◀┘
```

| Path | Responsibility |
|---|---|
| `src/constants/leads.js` | Status/priority enums, field limits, columns, storage keys (single source of truth) |
| `src/domain/validation.js` | Normalise, validate, find duplicates, sanitise documents read from Firestore |
| `src/domain/query.js` | Search, column filters, sorting, paging, Kanban grouping (pure functions) |
| `src/services/leadService.js` | All Firestore access: live subscription and writes, friendly error messages |
| `src/context/LeadsContext.jsx` | One live listener for the app; CRUD actions; offline handling |
| `src/hooks/` | `usePersistentState` (localStorage), `useDebounce`, `useLeadQuery` |
| `src/components/table/` | Table view, column filters, phone card list |
| `src/components/kanban/` | Kanban board (lazy-loaded), columns, draggable cards |
| `src/components/leads/` | Lead form, delete confirmation, chips, status dropdown |
| `src/components/common/` | Toasts, error boundary, loading / empty / error / setup screens |

### Key flows

- **Load:** `LeadsProvider` opens a single `onSnapshot` listener. Firestore's IndexedDB cache makes reloads instant and the app usable offline.
- **Save:** the form validates on blur and on submit. The service normalises the input (trims spaces, lowercases the email) and re-validates. The mobile must be exactly 10 digits (no spaces, `+` or dashes) and is written as a number. It then checks for duplicates against the loaded list and with a Firestore query before writing with server timestamps. Firestore rules validate the data a third time.
- **Status change:** Firestore applies the write locally, so the card moves instantly. If the server rejects the write, Firestore rolls it back and a toast explains why.
- **Offline:** writes are queued and the UI confirms "saved offline" instead of waiting; failures that happen after reconnecting appear as a toast.
- **Persistence:** leads live in Firestore. The chosen view, sort order and rows per page are kept in `localStorage`; stored values are validated before use.

### Data model

Collection `leads`:

| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–100 chars, trimmed |
| `email` | string | valid format, stored lowercase, ≤ 254 chars, unique |
| `mobile` | number (integer) | exactly 10 digits, numbers only, cannot start with 0, unique |
| `status` | enum | `NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `WON`, `LOST` |
| `priority` | enum | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `createdAt`, `updatedAt` | timestamp | set by the server |

## Security

- `firestore.rules` allows access to the `leads` collection only. It requires every field with the right type, length, format and enum value. It rejects unknown fields and client-supplied timestamps, and it blocks every other collection.
- React escapes all output and nothing uses `dangerouslySetInnerHTML`. `mailto:` and `tel:` links are built only from validated values.
- Inputs have length limits. Users see friendly messages only, never raw errors.
- `firebase.json` sets security headers for Firebase Hosting.
- Dependencies pass `npm audit` (a patched `@grpc/grpc-js` is forced through `overrides`).

**Known limitation:** by design this project has **no login**. The rules guarantee that stored data is well-formed, but anyone who has the app's config can read, change or delete leads. Before real use, add Firebase Auth (anonymous auth is enough) plus App Check, and require `request.auth != null` in the rules.

## Performance

- One real-time listener; no polling.
- Search, filtering, sorting and paging run client-side in memoised pure functions, with a debounced search box. This suits up to a few thousand leads; beyond that, move to Firestore queries with cursor paging plus a search index.
- Table rows and cards use `React.memo`. The Kanban view and dnd-kit load only when that view is opened. Vendor code is split into long-cacheable chunks; Firestore is the largest at about 167 kB gzipped.

## Tests

171 tests, about 97% line coverage. They cover validation and normalisation, the search/sort/paging pipeline, the service layer (Firebase mocked), hooks, context (including offline), the form, the delete dialog, the table (column search, sort, paging, phone layout), Kanban (drop handling, dropdown, search) and App-level flows. `npm run test:live` checks the same service against a real Firestore.
