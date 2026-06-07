# UEW CerTiFyHub — Context

This document captures the durable domain language and structural decisions of
the UEW CerTiFyHub codebase. ADRs in `docs/adr/` capture *why*; this document
captures *what*.

## Bounded contexts

### Identity & Access

- `core/` — `User`, `UserProfile`, role-based permissions, password reset,
  authorisation letters, two-person Super Admin deactivation.
- Permission keys live in `core/permission_constants.py` and are explicitly
  granted per-account by a Super Admin, justified by an authorisation letter.
- See ADRs 001–004.

### Templates

- `templates/` — Konva-based certificate template editor on the React side,
  with metadata (canvas, nodes, fonts) persisted as JSON. Templates carry a
  `status` (`draft` / `official`) and a `is_locked` flag.

### Registry (new in 2026)

- `registry/` — the certificate-issuance pipeline: faculties, departments,
  congregation sessions, student records, import batches, confirmation tokens,
  email delivery logs, audit logs.
- Aggregate root: `CongregationSession` (see ADR 005).
- Forward-only status machine:
  `Draft → Published → (Confirmation Open →) Confirmation Closed →
   Issuance In Progress → Completed → Archived`.
- Three-stage pipeline: **ingest** (admin uploads draft records) →
  **confirm** (students verify their data via emailed token) →
  **issue** (issuance engine produces certificates).
- Replaces the legacy `students.Student` model, which was retired entirely.

### Certificates

- `certificates/` — issued certificate records and PDF generation. A
  `Certificate` may link to a `registry.StudentRecord` via
  `Certificate.student_record` (nullable). Denormalised display fields
  (`student_name`, `program`, `date_awarded`, etc.) live on the certificate
  itself so historical records remain readable even if a record is later
  deleted or archived.

### Verification

- `verification/` — public certificate-authenticity lookup by certificate
  number or QR code. Logs each verification event into `analytics.AuditLog`.

### Notifications

- `notifications/` — in-app and email notifications for admins. Periodic tasks
  (Celery beat) check expired credentials, send daily digests, and verify the
  audit-log chain integrity.

### Analytics

- `analytics/` — `AuditLog` model + system dashboards (totals, trends,
  per-program breakdowns, per-day issuance/verification charts).

## Frontend

- Vite + React + Tailwind. Konva-based template editor.
- Admin app under `src/pages/`, components under `src/components/`,
  React Query–based hooks under `src/hooks/`.
- Public confirmation pages (planned) live under `/confirm/...` in the same
  Vite app, with an isolated layout (no admin shell).

## Key terminology

- **Congregation session** — A graduation/issuance event scoped institution-,
  faculty-, or department-wide. The aggregate root for the registry pipeline.
- **Student record** — A row of student data within a single session. Has
  per-record `confirmation_status` and `issuance_status`.
- **Confirmation token** — Single-use, hashed (SHA-256) token sent to the
  student's institutional email. Validates the `(session, index_number)`
  pair on the public confirmation page. Re-issued on dispute correction.
- **Import batch** — A single uploaded file's worth of student records.
  Carries totals, error log, and post-publish email summary.
- **Authorisation letter** — A printed document approving an admin account's
  permission set. Drives the provisioning flow in `core/`.

## Background workers

- Celery + Redis (config in `certificate_system/settings.py`). Celery falls
  back to eager execution when `REDIS_URL` is not set.
- Channels with Daphne (ASGI) is wired in for SSE / WebSocket use.

## Conventions

- **Repository pattern** for data access (ADR 001), one repository per
  aggregate. Services orchestrate, repositories query.
- **Service layer** owns business logic (ADR 002). Views call services.
- Tests mirror app structure under `<app>/tests/` and shared factories live
  in `tests/factories/`.
