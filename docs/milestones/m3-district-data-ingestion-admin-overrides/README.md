# Milestone 3: District Data Ingestion & Admin Overrides

## Overview

Ingest public district data into `district_ingestion_events`, compute `district_effective_attribute_values`, and support admin overrides. Seed initial attribute definitions and demo data for cold start.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-3-district-data-ingestion--admin-overrides)

## Dependencies

- [x] Milestone 2 (User Profiles, Districts, Taxonomy)

## Changes Required

| Area | Changes |
|------|---------|
| **Attribute definitions** | Seed `district_attribute_definitions` (per db-schema.md MVP set: type, enrollment, state, grade bands) |
| **Ingestion** | Job/script: parse source → normalize → insert `district_ingestion_events`; merge into `district_effective_attribute_values` |
| **Admin overrides** | `POST/PATCH /admin/districts/:id/overrides`; insert/update `district_admin_overrides`; recompute effective values |
| **Display** | Existing district endpoints surface `provenance`, `last_ingestion_event_id`, `last_override_id` where relevant |
| **Demo/seed** | Optional seed script for demo districts and users (`is_demo = true`) |

## Success Criteria

### Automated Verification

- [x] Ingestion job runs and populates `district_ingestion_events` and `district_effective_attribute_values`
- [x] Admin override updates effective values correctly
- [x] Source/timestamp visible in district API responses

### Manual Verification

- [x] Districts show ingested attributes with provenance
- [x] Admin can override a value and see updated display
- [x] Demo data available for cold-start testing

## Tasks

- [001-seed-attribute-definitions](./001-seed-attribute-definitions.md)
- [002-ingestion-job](./002-ingestion-job.md)
- [003-admin-overrides-api](./003-admin-overrides-api.md)
- [004-district-display-provenance](./004-district-display-provenance.md)
- [005-demo-seed-script](./005-demo-seed-script.md)
