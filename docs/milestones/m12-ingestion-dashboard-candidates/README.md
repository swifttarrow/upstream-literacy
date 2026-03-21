# Milestone 12: Ingestion Dashboard and District List UI

## Overview

Build the moderator-facing ingestion dashboard with upload area, district list (with completeness scores), and filters per PRD §§10.1, 10.2, 10.3, 11.1.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§10.1–10.3, 11.1

## Dependencies

- [x] Milestone 11 (Ingestion Console Foundation)

## Changes Required

| Area | Changes |
|------|---------|
| **Upload area** | Two required file inputs (CCD district CSV, EDGE geocode CSV); links to CCD and EDGE download pages |
| **Dashboard** | Summary cards (Total, Fully Complete, Partial, Incomplete); recent upload/jobs panel; filter bar |
| **District list** | Table with district name, state, NCES id, completeness score, missing indicator; search, state filter, completeness filter |
| **Navigation** | Link to district detail; CTA buttons (Upload New NCES Data, Retry Failed, View Low-Completeness) |
| **API integration** | Consume upload, district list, jobs API; wire filters and search |

## Success Criteria

### Automated Verification
- [x] Dashboard loads without error for moderator
- [ ] District list renders with correct columns including completeness
- [x] Filters and search reduce result set as expected

### Manual Verification
- [ ] Moderator sees upload area, summary counts, and recent jobs
- [x] Moderator can search by district name, filter by state and completeness
- [x] Moderator can navigate to district detail from list

## Tasks

- [001-ingestion-dashboard-layout](./001-ingestion-dashboard-layout.md)
- [002-district-candidate-table](./002-district-candidate-table.md)
- [003-dashboard-filters-and-actions](./003-dashboard-filters-and-actions.md)
