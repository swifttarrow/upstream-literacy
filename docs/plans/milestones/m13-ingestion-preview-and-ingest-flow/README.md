# Milestone 13: District Preview and Ingest Flow

## Overview

Implement the district preview screen, single and batch ingestion from the UI, and progress tracking per PRD §§10.3–10.5, 11.2–11.3.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§10.3–10.5, 11.2–11.3

## Dependencies

- [ ] Milestone 12 (Ingestion Dashboard and Candidate List UI)

## Changes Required

| Area | Changes |
|------|---------|
| **Preview** | District detail screen with source vs normalized values, missing indicators, source metadata; Ingest/Cancel actions |
| **Ingest API** | POST to trigger single or batch ingestion; create job; idempotency checks |
| **Progress** | Job detail screen or modal: progress bar, per-record status, live refresh |
| **Background** | Async job processing (pg-boss or similar); avoid blocking UI for batch |

## Success Criteria

### Automated Verification
- [ ] Preview API returns source and normalized data for candidate
- [ ] Ingest API creates job and processes districts
- [ ] Progress endpoint returns current job state
- [ ] Duplicate active ingestion for same district is prevented

### Manual Verification
- [ ] Moderator can preview district before ingesting
- [ ] Moderator can trigger single-district ingest and see progress
- [ ] Moderator can trigger batch ingest; progress updates during run
- [ ] Confirmation required for batch and ingest-all

## Tasks

- [001-district-preview-api](./001-district-preview-api.md)
- [002-district-preview-screen](./002-district-preview-screen.md)
- [003-ingest-trigger-api](./003-ingest-trigger-api.md)
- [004-ingestion-progress-ui](./004-ingestion-progress-ui.md)
- [005-batch-ingest-async](./005-batch-ingest-async.md)
