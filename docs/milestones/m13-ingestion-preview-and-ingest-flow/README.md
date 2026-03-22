# Milestone 13: Upload Flow and Completeness Scoring

## Overview

Implement the NCES file upload flow from the UI, automatic ingestion processing, completeness scoring per district, and progress tracking per PRD §§10.1, 10.4, 10.5, 10.7, 11.3.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§10.1, 10.4–10.5, 10.7, 11.3

## Dependencies

- [x] Milestone 12 (Ingestion Dashboard and District List UI)

## Changes Required

| Area | Changes |
|------|---------|
| **Upload flow** | UI upload triggers POST /admin/ingestion/upload; file validation; job creation |
| **Completeness scoring** | Compute per-district completeness (required vs recommended vs optional); persist and display |
| **Progress** | Job detail screen or modal: progress bar, per-record status, live refresh |
| **Background** | Async job processing (pg-boss); avoid blocking UI for large uploads |

## Success Criteria

### Automated Verification
- [x] Upload API accepts file and creates ingestion job
- [x] Completeness score computed per district after ingestion
- [x] Progress endpoint returns current job state
- [x] Large uploads process async without blocking UI

### Manual Verification
- [x] Moderator can upload NCES file from UI; progress visible
- [x] All districts auto-ingested; completeness scores displayed
- [x] Job progress updates during run; completion summary shown

## Tasks

- [001-district-preview-api](./001-district-preview-api.md) — district detail API (view; edit in m15)
- [002-district-preview-screen](./002-district-preview-screen.md) — district detail screen (view & edit)
- [003-ingest-trigger-api](./003-ingest-trigger-api.md) — upload API (or consumed from m11)
- [004-ingestion-progress-ui](./004-ingestion-progress-ui.md) — upload/ingestion job progress
- [005-batch-ingest-async](./005-batch-ingest-async.md) — async processing of uploaded file
