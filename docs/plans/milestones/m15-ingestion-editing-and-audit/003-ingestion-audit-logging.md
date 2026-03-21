# Task 003: Ingestion Audit Logging

## Goal

Maintain an audit log for district ingestion operations per PRD §10.10.

## Deliverables

- [ ] Audit entries for: preview viewed, ingestion started, ingestion completed, ingestion retried, district edited, override applied, override reverted
- [ ] Each record: actor, action_type, district_id, job_id (if applicable), before/after (where relevant), timestamp
- [ ] Persist to audit_log_entries or dedicated ingestion_audit table
- [ ] API for admin to query audit by district, actor, date range
- [ ] Integrate into preview, ingest trigger, edit, revert flows

## Notes

- PRD §10.10: audited actions and record fields
- Existing audit_log_entries may support generic structure; or add ingestion-specific table
- Admin-only access to full audit; moderator may see own actions

## Verification

- Perform preview, ingest, edit, revert; query audit; confirm entries with correct actor, action, district, timestamp
