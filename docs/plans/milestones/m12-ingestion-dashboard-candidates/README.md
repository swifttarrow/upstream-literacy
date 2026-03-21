# Milestone 12: Ingestion Dashboard and Candidate List UI

## Overview

Build the moderator-facing ingestion dashboard and district candidate list UI per PRD §§10.1, 10.2, 11.1.

**Source:** [District Data Ingestion PRD](../../../prds/district-data-ingestion.md) §§10.1–10.2, 11.1

## Dependencies

- [ ] Milestone 11 (Ingestion Console Foundation)

## Changes Required

| Area | Changes |
|------|---------|
| **Dashboard** | Summary cards (Not Ingested, Ingested, Warnings, Failed); recent jobs panel; filter bar |
| **Candidate list** | Table with district name, state, NCES id, status, missing indicator; search, state filter, status filter |
| **Navigation** | Link to district preview; CTA buttons (Ingest Selected, Retry Failed, View Warnings) |
| **API integration** | Consume candidates API, jobs API; wire filters and search |

## Success Criteria

### Automated Verification
- [ ] Dashboard loads without error for moderator
- [ ] Candidate list renders with correct columns
- [ ] Filters and search reduce result set as expected

### Manual Verification
- [ ] Moderator sees summary counts and recent jobs
- [ ] Moderator can search by district name, filter by state and status
- [ ] Moderator can navigate to district preview from list

## Tasks

- [001-ingestion-dashboard-layout](./001-ingestion-dashboard-layout.md)
- [002-district-candidate-table](./002-district-candidate-table.md)
- [003-dashboard-filters-and-actions](./003-dashboard-filters-and-actions.md)
