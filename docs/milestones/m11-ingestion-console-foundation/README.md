# Milestone 11: Ingestion Console Foundation

## Overview

Establish the backend foundation for the district data ingestion console: NCES CCD file upload, parse, auto-ingest, ingestion job model, district list API (with completeness), and RBAC for moderator/admin access. No pre-seeded district list—districts come from uploaded NCES files.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§8–10, 15

## Dependencies

- [x] Milestone 3 (District Data Ingestion & Admin Overrides)

## Changes Required

| Area | Changes |
|------|---------|
| **NCES upload** | Upload endpoint for CCD CSV; parse and validate; create ingestion job |
| **Schema** | Ingestion job table (or extend district_ingestion_events for job-level tracking); district status and completeness fields |
| **API** | Upload endpoint; district list endpoint with completeness, filters; job model for tracking |
| **RBAC** | Moderator/admin can access ingestion endpoints; require platform_role check |

## Success Criteria

### Automated Verification
- [ ] Upload endpoint accepts CCD CSV and creates ingestion job
- [ ] District list API returns records with completeness scores and status
- [ ] Ingestion job creation persists job record with status
- [x] Non-moderator/admin receives 403 on ingestion endpoints

### Manual Verification
- [ ] Moderator can upload NCES file via API
- [ ] Moderator can fetch district list with completeness

## Tasks

- [001-nces-upload-and-parse](./001-nces-upload-and-parse.md) — replaces 001-seed-100-districts-nces-mappings
- [002-ingestion-job-model](./002-ingestion-job-model.md)
- [003-district-candidates-api](./003-district-candidates-api.md)
- [004-ingestion-console-rbac](./004-ingestion-console-rbac.md)
