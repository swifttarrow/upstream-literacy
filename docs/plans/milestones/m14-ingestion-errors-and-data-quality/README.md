# Milestone 14: Ingestion Errors and Data Quality

## Overview

Capture and display ingestion errors, detect and flag missing data, and provide in-UI notifications for job lifecycle events per PRD §§10.6–10.8.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§10.6–10.8

## Dependencies

- [ ] Milestone 13 (District Preview and Ingest Flow)

## Changes Required

| Area | Changes |
|------|---------|
| **Error capture** | Persist error entries (district, error type, message, timestamp, job id, retry eligibility) |
| **Error display** | UI to inspect errors, retry eligible failures |
| **Missing data** | Field/record/job-level detection; warning states (Missing Optional, Missing Required, Derived Used, Source Incomplete) |
| **Notifications** | In-UI alerts when job starts, completes, completes with warnings, fails |
| **Retry** | Retry failed records from same job |

## Success Criteria

### Automated Verification
- [ ] Ingestion errors persisted with required fields
- [ ] Missing data rules classify records correctly (Ready/Warning/Blocked)
- [ ] Retry API processes failed records from job

### Manual Verification
- [ ] Moderator sees error details for failed districts
- [ ] Moderator can retry eligible failures
- [ ] Missing data warnings surfaced in preview and job summary
- [ ] Job completion/failure triggers visible notification

## Tasks

- [001-error-capture-and-storage](./001-error-capture-and-storage.md)
- [002-error-display-and-retry](./002-error-display-and-retry.md)
- [003-missing-data-detection](./003-missing-data-detection.md)
- [004-ingestion-notifications](./004-ingestion-notifications.md)
