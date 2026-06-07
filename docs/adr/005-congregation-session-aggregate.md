# ADR 005: Congregation Session as the Registry Aggregate Root

## Status

Accepted (Slice 1 of registry pipeline).

## Context

The product needs a multi-stage pipeline (ingest → confirm → issue) for issuing
certificates to a class of graduates at a congregation ceremony. The legacy
`students.Student` model represented a flat, global directory of students with
no notion of cohort, ceremony, or issuance lifecycle. That model was unable to
express:

- Per-cohort scoping (institution-wide vs faculty vs department).
- A status machine governing the path from draft data to issued certificate.
- Public confirmation tokens scoped to a specific event.
- Auditing of pre-issuance disputes and corrections.

## Decision

Introduce a new `registry` Django app whose aggregate root is
`CongregationSession`. Every `StudentRecord` belongs to exactly one session.
All confirmation tokens, dispute records, email delivery logs, and import
batches are scoped to a session. The session carries a forward-only status
machine: `Draft → Published → (Confirmation Open →) Confirmation Closed →
Issuance In Progress → Completed → Archived`.

The legacy `students` app is removed entirely. `Certificate.student` is
replaced with `Certificate.student_record`, a nullable FK to
`registry.StudentRecord`. Historical certificate data is preserved on the
denormalised fields already present on `Certificate` (`student_name`,
`program`, etc.).

## Consequences

- **Positive**: All certificate-issuance work is naturally batched, audited,
  and gated by a session lifecycle. Confirmation tokens have a clear scope.
  Permissions follow session boundaries.
- **Positive**: Dropping `students.Student` removes a legacy global directory
  that conflicted with the per-cohort model.
- **Negative**: One-time dev DB wipe was required (existing student rows are
  not migrated to `StudentRecord`). Production deployments must follow the
  same wipe path or run a custom data migration; this is out of scope here.
- **Negative**: Some downstream code (e.g. `Certificate.bulk_issue`) was
  retired. Bulk issuance must now go through the registry pipeline.

## Related work

- Slice 1: foundation models, faculty/department CRUD, retire `students` app.
- Slices 2–7: build out import, confirmation, dispute, issuance, async, polish.
