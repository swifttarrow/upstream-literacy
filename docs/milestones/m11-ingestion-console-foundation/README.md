# Milestone 11: Ingestion Console Foundation

## Overview

Establish the backend foundation for the real district data ingestion console: 100-district seed list with NCES mappings, ingestion job model, district candidate API, and RBAC for moderator/admin access.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§8–10, 15

## Dependencies

- [x] Milestone 3 (District Data Ingestion & Admin Overrides)

## Changes Required

| Area | Changes |
|------|---------|
| **Seed data** | Curated 100-district list with NCES identifiers; JSON/CSV seed file |
| **Schema** | Ingestion job table (or extend district_ingestion_events for job-level tracking); district candidate status fields if needed |
| **API** | District candidate list endpoint with status, filters; job model for tracking |
| **RBAC** | Moderator/admin can access ingestion endpoints; require platform_role check |

## Success Criteria

### Automated Verification
- [x] District candidate API returns 100 records with NCES ids and status
- [x] Ingestion job creation persists job record with status
- [x] Non-moderator/admin receives 403 on ingestion endpoints

### Manual Verification
- [ ] Moderator can fetch candidate list
- [ ] Seed data loads with correct NCES mappings for all 100 districts

## Tasks

- [001-seed-100-districts-nces-mappings](./001-seed-100-districts-nces-mappings.md)
- [002-ingestion-job-model](./002-ingestion-job-model.md)
- [003-district-candidates-api](./003-district-candidates-api.md)
- [004-ingestion-console-rbac](./004-ingestion-console-rbac.md)
