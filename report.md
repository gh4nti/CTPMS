# Clinical Trial Patient Management System (CTPMS) - Comprehensive Project Report

Generated on: 2026-04-07
Workspace root: /Users/adarshinaganti/dev/CTPMS

## 1) Executive Summary

CTPMS is a full-stack clinical operations application for managing patient intake, patient records, trial enrollment status, appointment scheduling, billing/invoicing, payments, analytics, and operational administration (bulk import, backup/restore, audit logs).

The project combines:

- React + TypeScript frontend (Vite + Tailwind)
- Express backend API
- SQLite database (`clinical_trials.db`)

It supports role-based access control (RBAC) through request headers and client session state with two roles:

- `admin`: full management permissions
- `guest`: read-only behavior in UI and API write restrictions

## 2) Tech Stack and Runtime Model

## 2.1 Frontend

- React `18.3.1`
- React Router DOM `7.14.0`
- TypeScript `5.7.2`
- Tailwind CSS `3.4.17`
- Vite `5.4.12`

Key files:

- `src/main.tsx`
- `src/App.tsx`
- `src/AllPatients.tsx`
- `src/Appointments.tsx`
- `src/PatientProfile.tsx`
- `src/ReportsDashboard.tsx`
- `src/index.css`

## 2.2 Backend

- Express `5.2.1`
- body-parser `2.2.2`
- sqlite3 `6.0.1`

Key files:

- `server.js`
- `api/[...path].js` (exports `server.js`, useful for serverless-style entrypoint)

## 2.3 Build/Tooling

- Vite dev server on `5173`
- API server on `3000`
- Vite proxy forwards `/api/*` to backend

Key config files:

- `package.json`
- `vite.config.mjs`
- `tailwind.config.js`
- `postcss.config.js`
- `tsconfig.json`
- `index.html`

## 2.4 Scripts

From `package.json`:

- `npm run dev`: concurrently runs backend + frontend
- `npm run dev:server`: node server
- `npm run dev:client`: vite
- `npm run build`: vite build to `dist/`
- `npm run preview`: vite preview
- `npm start`: node server (serves API and built frontend if `dist` exists)

## 2.5 Deployment/Serving Behavior

`server.js` serves static frontend if `dist/` exists:

- `app.use(express.static(distPath))`
- fallback to `dist/index.html` for non-`/api` and non-`/patients` routes

This enables production-style single-host deployment from the Express process.

## 3) Project Structure (Functional View)

Top-level notable paths:

- `src/`: UI pages, auth, route protection, modules
- `src/features/appointments/`: appointments types and API client
- `src/features/billing/`: billing domain model, API client, UI components
- `src/features/patients/`: patient profile domain types/API/hook/components/formatting/archive state
- `api/[...path].js`: backend export shim
- `server.js`: all API routes + DB table creation + RBAC + audit logic
- `clinical_trials.db`: SQLite DB
- `scripts/`: currently empty

## 4) Frontend Application Architecture

## 4.1 Entry and Route Wiring

`src/main.tsx` defines all routes and wraps each with `ProtectedRoute`.

Routes:

- `/` -> `App`
- `/patients/:id` -> `PatientProfile`
- `/patients/:id/edit` -> `PatientProfile` (with edit mode, and route-level permission requirement)
- `/all-patients` -> `AllPatients`
- `/appointments` -> `Appointments`
- `/reports` -> `ReportsDashboard`
- `/billing` -> `Billing`

Each route receives `currentUser` and in some pages `onLogout`.

## 4.2 Auth Model

Auth is implemented client-side in `src/auth.ts`:

- Session user stored in localStorage key: `ctpms_auth_user`
- Session expiration stored in key: `ctpms_auth_expires_at`
- Session TTL: 15 minutes
- Role permissions hardcoded in frontend and mirrored in backend

Supported permissions:

- `patients:create`
- `patients:edit`
- `patients:delete`
- `appointments:write`
- `billing:write`
- `audit:read`

Role map:

- `admin`: all above permissions
- `guest`: none

`fetchWithAuth` injects headers:

- `X-CTPMS-User`
- `X-CTPMS-Role`

Login flow (`src/main.tsx` + `src/Login.tsx`):

- Demo credentials accepted:
    - admin / 123
    - guest / 123
- 300ms simulated delay
- invalid credentials show inline error
- auth session check every 30s

## 4.3 Route Protection

`src/ProtectedRoute.tsx`:

- If not authenticated -> renders Login
- If permission required and user lacks permission -> renders Access Denied view
- Otherwise renders protected children

## 5) UI Pages and Features

## 5.1 Home Dashboard (`src/App.tsx`)

Purpose:

- Entry dashboard after login
- Patient enrollment form and quick access to patient cards

Features:

- Navigation buttons: Reports, Appointments, Billing, Logout
- Enrollment section with `PatientForm` in create mode
- Permission-aware behavior:
    - admin can create patient
    - guest sees read-only warning
- Loads active patient records from `/api/patients`
- Shows first 6 cards + `Show More` link to all-patients page
- Status pill visual mapping for enrollment status

## 5.2 Patient Form (`src/PatientForm.tsx`)

Reusable create/edit form with:

- Strong client-side validation:
    - required fields
    - DOB not in future, age within reasonable bounds
    - phone regex validation
    - email format validation
    - height range (1-300)
    - weight range (1-500)
    - blood group required
    - in edit mode: enrollment status required
- Error summary panel + per-field errors
- Unsaved-changes protection via `beforeunload` listener

## 5.3 All Patients (`src/AllPatients.tsx`)

Purpose:

- Full patient explorer and data operations center

Core capabilities:

- Fetches all patients from `/api/patients`
- Advanced filtering/search:
    - free text across multiple fields
    - fielded query syntax using `key:value`
    - supported keys:
        - `id`, `name`, `phone`, `email`, `status`, `gender`, `age`, `dob`, `disease`, `trial`
    - age expressions:
        - exact age (`age:40`)
        - comparators (`age:>40`, `age:<=18`)
        - ranges (`age:18-40`)
- Filter controls:
    - enrollment status
    - gender
    - age buckets (`under18`, `18to40`, `41to60`, `61plus`)
- Export functions:
    - CSV export of filtered set
    - print/PDF-style export via popup print window
- Bulk import workflow:
    - upload CSV
    - parse + validate headers/rows client-side
    - preview via `/api/patients/import/preview`
    - commit via `/api/patients/import/commit`
    - post-import list refresh
- System operations:
    - download full JSON backup (`/api/system/backup`)
    - upload JSON and restore (`/api/system/restore`)
    - destructive restore confirm prompt

Permission handling:

- Import requires `patients:create`
- Backup/restore requires `patients:delete`

## 5.4 Patient Profile (`src/PatientProfile.tsx`)

Page composition:

- `ProfileHeader`
- `ProfileTopBar`
- either `PatientProfileDetailsView` or `PatientProfileEditView`
- `AlertBanner` for errors

Edit mode detection:

- path ends with `/edit`

Data/state orchestration:

- `usePatientProfile` hook handles all loading/actions

## 5.5 Patient Profile Hook (`src/features/patients/hooks/usePatientProfile.ts`)

Responsibilities:

- Load patient by id (`fetchPatientById`)
- Load records (`fetchPatientRecordsById`)
- Maintain loading/error/update/deletion state
- Manage archive toggle
- Handle schedule appointment redirect
- Handle delete patient flow with confirmation
- Handle update patient submit, then navigate back to details

Archiving behavior:

- purely client-side localStorage via `archive.ts`
- storage key: `ctpms_archived_patients`
- not persisted in server DB

## 5.6 Patient Detail Components

Under `src/features/patients/components/` and `details/`:

- `PatientProfileDetailsView`
- `PatientProfileEditView`
- `AlertBanner`
- `ProfileHeader`
- `ProfileTopBar`
- detail cards:
    - `OverviewCard`
    - `BasicInfoCard`
    - `ContactEnrollmentCard`
    - `VisitHistoryCard`
    - `MedicationsCard`
    - `AllergiesCard`
    - `NotesCard`
    - `QuickActionsCard`

Expected data shown:

- demographics
- enrollment/trial context
- medication history
- recent lab-result visits with interpretation
- placeholders for notes/allergies where not populated by backend

## 5.7 Appointments Page (`src/Appointments.tsx`)

Purpose:

- Schedule management for clinic appointments with conflict prevention

Features:

- Daily and weekly calendar modes
- Date picker for selected day/week
- Range-based loading from API (`from`, `to`)
- Appointment cards with:
    - status badge
    - time range
    - duration
    - location
    - notes
- Booking/rescheduling form:
    - patient select
    - title
    - start/end datetime
    - location
    - notes
- End-before-start validation
- Actions:
    - create
    - update
    - cancel
- Permission-aware UI:
    - guest is read-only
    - admin can book/reschedule/cancel
- Supports deep-linking from patient profile using query `?patientId=`

## 5.8 Billing Page (`src/features/billing/components/Billing.tsx`)

Purpose:

- End-to-end invoice and payment operations

Features:

- Loads patient options for invoice creation
- Invoice table with status filter (`all`, `pending`, `paid`, `overdue`)
- Invoice details modal
- Create invoice modal
- Permission-aware actions (`billing:write` required for create/payment/status changes)

## 5.9 Invoice List (`src/features/billing/components/InvoiceList.tsx`)

- Fetches invoices from backend with optional patient and status filter
- Displays invoice number, patient, date, amount, status, paid amount
- Click `View` to open details
- Status color mapping:
    - pending (yellow)
    - paid (green)
    - overdue (red)
    - cancelled (gray)

## 5.10 Invoice Detail View (`src/features/billing/components/InvoiceDetailView.tsx`)

Features:

- Fetches invoice detail by id
- Displays patient contact, invoice metadata, payment summary
- Record payment form:
    - amount
    - method
    - reference number
    - notes
- Receipt generation:
    - download text receipt
    - print formatted HTML receipt
- Updates parent list after payment/status changes

## 5.11 Create Invoice Modal (`src/features/billing/components/CreateInvoiceModal.tsx`)

Features:

- patient selector
- amount input
- description input
- due date picker (defaults to +30 days)
- calls create invoice API
- permission checked before submit

## 5.12 Reports Dashboard (`src/ReportsDashboard.tsx`)

Purpose:

- Operational metrics and business analytics overview

Metrics consumed from `/api/reports/dashboard?months=12`:

- new patients per month
- appointment completion rate
- revenue summary
- top services by revenue

UI details:

- month bars with relative height scaling
- INR currency formatting
- completion rate shown with one decimal place (already percent)
- cross-navigation links to Home/Appointments/Billing

## 5.13 Theming and Styling (`src/index.css`)

Highlights:

- Tailwind base/components/utilities
- light mode gradient/radial background
- dark mode support with utility overrides
- patient card hover enhancements
- custom color tokens align with Tailwind extension (`ink`, `paper`, `brand`)

## 6) Domain Modules and Types

## 6.1 Patients Domain (`src/features/patients/`)

Files:

- `api.ts`
- `types.ts`
- `archive.ts`
- `formatters.ts`
- `hooks/usePatientProfile.ts`

Types include:

- `Patient`
- `ClinicalVisit`
- `ClinicalMedication`
- `ClinicalRecordNote`
- `ClinicalRecords`
- `PatientUpdatePayload`

Utilities include:

- status formatting
- gender formatting
- UTC display date formatting
- medication date range formatting

## 6.2 Appointments Domain (`src/features/appointments/`)

Files:

- `api.ts`
- `types.ts`

API client functions:

- `fetchPatients`
- `fetchAppointments`
- `createAppointment`
- `updateAppointment`
- `cancelAppointment`

Types:

- `AppointmentStatus`
- `Appointment`
- `AppointmentRangeResponse`
- `AppointmentFormState`

## 6.3 Billing Domain (`src/features/billing/`)

Files:

- `api.ts`
- `types.ts`
- `index.ts`
- `components/*`

API client functions:

- `getInvoices`
- `getInvoiceDetail`
- `createInvoice`
- `updateInvoiceStatus`
- `getPayments`
- `getPaymentDetail`
- `createPayment`

Types:

- `InvoiceStatus`
- `PaymentStatus`
- `PaymentMethod`
- `Invoice`
- `InvoiceDetail`
- `Payment`
- `PaymentDetail`
- request payload types for create/update

## 7) Backend Architecture (`server.js`)

`server.js` centralizes:

- DB schema setup for app-managed tables
- RBAC helpers
- audit logger
- normalization/validation helpers
- all API route handlers
- static serving for built frontend

## 7.1 Middleware and API Prefix Handling

Backend strips `/api` prefix if present:

- incoming `/api/patients` becomes `/patients`

This lets same route handlers work both in direct and proxied contexts.

## 7.2 RBAC / Actor Resolution

Role extracted from header:

- `x-ctpms-role`: normalized to `admin` or fallback `guest`
  User extracted from:
- `x-ctpms-user` (truncated to 120 chars)

Permission checks use `requirePermission` helper and return:

- HTTP 403 on missing permission with details

## 7.3 Audit Logging

`logAuditEvent` stores event rows in `audit_logs` with:

- actor info
- action
- entity type/id
- before/after JSON snapshots
- request metadata (method/path/ip/user-agent)

## 8) Database Schema and Data Model

## 8.1 Tables Created/Ensured by Server Startup

### `audit_logs`

Columns:

- `audit_id` PK
- `actor_username`, `actor_role`
- `action`
- `entity_type`, `entity_id`
- `before_json`, `after_json`, `metadata_json`
- `created_at`

Indexes:

- `idx_audit_logs_created_at`
- `idx_audit_logs_entity` (`entity_type`, `entity_id`)

### `appointments`

Columns:

- `appointment_id` PK
- `patient_id` FK-style reference
- `title`
- `start_time`, `end_time`
- `location`, `notes`
- `status` (default `scheduled`)
- `created_at`, `updated_at`

Indexes:

- `idx_appointments_patient_id`
- `idx_appointments_start_time`

### `invoices`

Columns:

- `invoice_id` PK
- `patient_id`
- `invoice_number` unique
- `invoice_date`
- `due_date`
- `amount`
- `description`
- `status` (default `pending`)
- `created_at`, `updated_at`

Indexes:

- `idx_invoices_patient_id`
- `idx_invoices_status`
- `idx_invoices_invoice_date`

### `payments`

Columns:

- `payment_id` PK
- `invoice_id`
- `patient_id`
- `amount`
- `payment_date`
- `payment_method`
- `status` (default `pending`, but write path stores `completed`)
- `reference_number`, `notes`
- `created_at`, `updated_at`

Indexes:

- `idx_payments_invoice_id`
- `idx_payments_patient_id`
- `idx_payments_status`

## 8.2 Upstream/Pre-existing Tables Referenced by Queries

Read or update operations also depend on:

- `patients`
- `patient_trial_matches`
- `enrollment`
- `diagnoses`
- `diseases`
- `clinical_trials`
- `patient_medications`
- `medications`
- `lab_results`
- `lab_tests`

## 8.3 Computed/Derived Data

- Patient `age` computed from DOB in SQL
- `enrollment_status` resolved via CASE over enrollment/match values
- Patient `disease` resolved from latest diagnosis or trial target disease
- Invoice `paid_amount` computed via SUM of completed payments
- Lab visit `interpretation` computed in JS (`Below range`/`Within range`/`Above range`)

## 9) Complete API Surface (23 Endpoints)

All listed endpoints are implemented in `server.js`.

## 9.1 Patient Import and System Operations

1. `POST /patients/import/preview`

- Permission: `patients:create`
- Validates batch records and returns per-row validation summary
- No DB writes

2. `POST /patients/import/commit`

- Permission: `patients:create`
- Revalidates and inserts valid records transactionally
- Audit action: `patients.import`

3. `GET /system/backup`

- Permission: `patients:delete`
- Returns full DB export JSON of all non-sqlite internal tables

4. `POST /system/restore`

- Permission: `patients:delete`
- Full destructive restore from backup payload
- Transaction + foreign key disable/enable
- Audit action: `system.restore`

## 9.2 Patient APIs

5. `GET /patients`

- Returns list with joined/computed demographics + trial/enrollment context

6. `GET /patients/:id`

- Returns single patient view model

7. `GET /patients/:id/records`

- Returns medications + recent lab-based visit history + empty notes/allergies arrays

8. `POST /patients`

- Permission: `patients:create`
- Validates required fields + duplicate checks (name/email)
- Writes patient row
- Audit action: `patients.create`

9. `PUT /patients/:id`

- Permission: `patients:edit`
- Validates payload and updates patient
- Optional enrollment status update through helper
- Uses transaction and duplicate checks
- Audit action: `patients.update`

10. `DELETE /patients/:id`

- Permission: `patients:delete`
- Deletes dependent rows across multiple tables, then patient
- Audit action: `patients.delete`

## 9.3 Appointment APIs

11. `GET /appointments`

- Query: `from`, `to`, optional `patientId`
- Returns overlapping-in-range non-cancelled appointments

12. `POST /appointments`

- Permission: `appointments:write`
- Validates patient/time/title
- Checks scheduling conflicts
- Writes appointment with `scheduled` status
- Audit action: `appointments.create`

13. `PUT /appointments/:id`

- Permission: `appointments:write`
- Reschedules existing appointment
- Blocks rescheduling if current status is cancelled
- Re-checks conflicts excluding current appointment
- Audit action: `appointments.update`

14. `PATCH /appointments/:id/cancel`

- Permission: `appointments:write`
- Soft-cancel by setting status `cancelled`
- Idempotent behavior if already cancelled
- Audit action: `appointments.cancel`

## 9.4 Billing APIs (Invoices)

15. `GET /invoices`

- Query: optional `patientId`, `status`
- Returns invoice list with `paid_amount` aggregate

16. `GET /invoices/:id`

- Returns invoice details + nested payments list

17. `POST /invoices`

- Permission: `billing:write`
- Validates patient, amount, dueDate
- Auto-generates invoice number (`INV-...`)
- Writes pending invoice
- Audit action: `invoices.create`

18. `PATCH /invoices/:id/status`

- Permission: `billing:write`
- Validates status (`pending|paid|overdue|cancelled`)
- Updates invoice status
- Audit action: `invoices.status.update`

## 9.5 Billing APIs (Payments)

19. `GET /payments`

- Query: optional `invoiceId`, `patientId`, `status`
- Returns payment list joined to invoice/patient display fields

20. `POST /payments`

- Permission: `billing:write`
- Validates invoice + amount
- Rejects overpayment beyond invoice total
- Writes payment with status `completed`
- Auto-updates invoice to `paid` if fully settled (within 0.01 tolerance)
- Audit action: `payments.create`

21. `GET /payments/:id`

- Returns single payment detail plus invoice and patient context

## 9.6 Reporting and Audit APIs

22. `GET /reports/dashboard`

- Query: optional `months` (1..24; default 12)
- Returns:
    - `new_patients_per_month`
    - `appointment_completion_rate` (rate is percent number)
    - `revenue_summary`
    - `top_services`

23. `GET /audit-logs`

- Permission: `audit:read`
- Query: optional `limit` (default 100, max 500)
- Returns newest-first audit log entries

## 10) Validation Rules and Business Logic

## 10.1 Common Validation

- Numeric ID checks ensure integer > 0
- Date fields parsed via `parseIsoDateTime`
- status normalization functions gate accepted enums

## 10.2 Patient Validation (Create/Update/Import)

Checks include:

- required fields present
- DOB valid and not future (import path)
- phone regex pattern
- email regex pattern
- height and weight positive (plus stricter import upper bounds)
- duplicate detection by trimmed lowercase name/email

## 10.3 Appointment Conflict Model

Conflict query finds any non-cancelled appointment where:

- existing.start < new.end
- existing.end > new.start

Implication:

- global clinic-level overlap prevention (not per provider/room)

## 10.4 Billing Math Rules

- Payment cannot exceed remaining invoice amount
- Fully paid when `abs(newTotalPaid - invoice.amount) < 0.01`
- completed payments contribute to paid totals

## 11) Report Metrics Implementation Details

`GET /reports/dashboard` internals:

- Monthly patient trend:
    - recursive month CTE from `months` window
    - left join counts from `patients.created_at`
- Appointment completion:
    - includes appointments whose end time is in the past
    - splits into completed (not cancelled) vs cancelled
    - `rate = completed / (completed + cancelled) * 100`
- Revenue summary:
    - invoiced excludes cancelled invoices
    - collected sums completed payments
    - outstanding = max(0, invoiced - collected)
- Top services:
    - grouped by normalized invoice description
    - excludes cancelled invoices
    - sorted by revenue desc

## 12) Data Import/Export/Disaster Recovery

## 12.1 CSV Import Format

Required CSV headers expected by UI parser:

- `fullName`
- `dob`
- `gender`
- `phone`
- `email`
- `heightCm`
- `weightKg`
- `bloodGroup`

Optional header:

- `enrollmentStatus`

## 12.2 Import Flow Guarantees

- Preview endpoint does full validation before commit
- Commit endpoint performs validation again (defensive)
- Import writes occur in DB transaction

## 12.3 Backup/Restore Semantics

- Backup exports all non-sqlite internal tables with all rows
- Restore truncates known tables first, then inserts payload data
- Foreign keys temporarily turned off during restore
- Designed as full replacement, not merge

## 13) Security and Access Control Assessment

Current model characteristics:

- Client-authenticated through localStorage session only
- Role and user identity carried by headers
- Server trusts role header after normalization (admin or guest)
- RBAC enforced server-side for mutating/sensitive endpoints

Strengths:

- write paths protected by permission checks
- auditable mutation trail

Limitations:

- no real identity provider
- no signed tokens/JWT/session cookies
- headers can be forged outside trusted UI context
- intended for controlled/demo/internal usage unless hardened

## 14) Error Handling Patterns

Backend error response pattern:

- `error`: short error label
- `details`: optional diagnostic message

Frontend:

- API clients often parse JSON errors and surface `details`
- user-facing alerts/messages shown in-page
- destructive actions include confirm dialogs

## 15) Performance and Scalability Considerations

Potential hotspots:

- Appointment conflict checks on large schedules (single conflict query per write)
- Complex patient list query with multiple latest-record CTEs
- Dashboard aggregation computed on request (no cache)
- Audit log growth over time

Current scale profile:

- SQLite-backed single process
- suitable for small-to-medium internal deployments
- no built-in horizontal scaling strategy

## 16) Known Product/Implementation Constraints

1. Archive state is local-only

- Patient archiving stored in browser localStorage
- Not shared across users/devices

2. Notes and allergies are placeholder arrays in records API

- no backend tables currently wired for these domains in route output

3. Appointment model has global overlap prevention

- no clinician/room resource dimension

4. Demo login credentials hardcoded

- no user management UI or password management

5. Payment status field supports multiple values, but create flow writes `completed`

- effectively immediate settlement model in current implementation

## 17) File-by-File Capability Index

## 17.1 Top-Level

- `README.md`: quick start and API summary
- `package.json`: scripts/deps
- `server.js`: API + DB + auth + audit + static serving
- `api/[...path].js`: exports app
- `clinical_trials.db`: persisted data
- `index.html`: SPA entry shell
- `vite.config.mjs`: dev server + API proxy
- `tailwind.config.js`: styling extension
- `postcss.config.js`: CSS processing
- `tsconfig.json`: TS compile config
- `scripts/`: empty currently

## 17.2 Source Root

- `src/main.tsx`: app bootstrap and route declarations
- `src/auth.ts`: role/permission/session/auth headers/fetch wrapper
- `src/ProtectedRoute.tsx`: route guard + access denied UI
- `src/Login.tsx`: login screen and demo credential guidance
- `src/App.tsx`: home dashboard and patient enrollment/list snapshot
- `src/AllPatients.tsx`: full list, filters, import/export/backup/restore
- `src/PatientForm.tsx`: validation-heavy create/edit form
- `src/PatientProfile.tsx`: profile container page
- `src/Appointments.tsx`: scheduling UI and CRUD actions
- `src/ReportsDashboard.tsx`: analytics UI
- `src/index.css`: global theme and dark mode adjustments

## 17.3 Feature Modules

Appointments:

- `src/features/appointments/api.ts`
- `src/features/appointments/types.ts`

Billing:

- `src/features/billing/api.ts`
- `src/features/billing/types.ts`
- `src/features/billing/index.ts`
- `src/features/billing/components/Billing.tsx`
- `src/features/billing/components/InvoiceList.tsx`
- `src/features/billing/components/InvoiceDetailView.tsx`
- `src/features/billing/components/CreateInvoiceModal.tsx`

Patients:

- `src/features/patients/api.ts`
- `src/features/patients/types.ts`
- `src/features/patients/formatters.ts`
- `src/features/patients/archive.ts`
- `src/features/patients/hooks/usePatientProfile.ts`
- `src/features/patients/components/AlertBanner.tsx`
- `src/features/patients/components/ProfileHeader.tsx`
- `src/features/patients/components/ProfileTopBar.tsx`
- `src/features/patients/components/PatientProfileDetailsView.tsx`
- `src/features/patients/components/PatientProfileEditView.tsx`
- `src/features/patients/components/details/OverviewCard.tsx`
- `src/features/patients/components/details/BasicInfoCard.tsx`
- `src/features/patients/components/details/ContactEnrollmentCard.tsx`
- `src/features/patients/components/details/VisitHistoryCard.tsx`
- `src/features/patients/components/details/MedicationsCard.tsx`
- `src/features/patients/components/details/AllergiesCard.tsx`
- `src/features/patients/components/details/NotesCard.tsx`
- `src/features/patients/components/details/QuickActionsCard.tsx`

## 18) Operational Notes

- Development command: `npm run dev`
- Frontend URL: `http://localhost:5173`
- Backend URL: `http://localhost:3000`
- API in frontend should be called as `/api/...` (proxy handles target)
- Production-like run:
    - `npm run build`
    - `npm start`

## 19) Suggested Hardening / Future Enhancements (Optional)

1. Replace demo auth with real authentication

- JWT or secure server session
- hashed passwords
- user store and role management

2. Move archive state server-side

- add archived flag table/column
- support multi-user consistency

3. Extend appointment model

- room/provider resource dimensions
- recurrence support
- timezone-aware scheduling

4. Expand clinical record domains

- notes/allergies CRUD endpoints and tables

5. Improve observability

- structured logging and error tracking
- audit log viewer UI

6. Add migration tooling

- schema versioning and repeatable migration scripts

## 20) Conclusion

CTPMS is a coherent, feature-rich clinical operations platform with strong practical coverage across patient operations, scheduling, billing, analytics, and admin controls. Its current architecture is straightforward and maintainable for small-to-medium internal usage, with clear extension points for enterprise-grade security and scale.
