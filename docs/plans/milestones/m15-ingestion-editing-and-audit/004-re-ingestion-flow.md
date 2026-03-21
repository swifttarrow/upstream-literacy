# Task 004: Re-Ingestion Flow

## Goal

Allow moderators to re-run ingestion for already-ingested districts with preview and overwrite warning per PRD §10.11.

## Deliverables

- [ ] Re-ingest action available for ingested districts (from candidate list or district detail)
- [ ] Preview shows current ingested version vs incoming preview version (diff or side-by-side)
- [ ] Warning before overwrite/merge: "Re-ingestion will update X fields. Overrides will be preserved / merged (define policy)."
- [ ] Confirm step before proceeding
- [ ] Preserve district_ingestion_events history (append new event, don't delete)
- [ ] Policy: overrides preserved by default, or merge with user choice; document in PRD open questions
- [ ] Re-ingest creates new job; same progress UI

## Notes

- PRD §10.11: show current vs incoming; warn; preserve historical records
- PRD §19 open question: merge with overrides or preserve overrides automatically
- Recommended: preserve overrides; only update source-backed fields; allow moderator to revert override then re-ingest if desired

## Verification

- Ingest district; re-ingest; preview shows current vs incoming; confirm overwrites; new ingestion event appended; overrides preserved per policy
