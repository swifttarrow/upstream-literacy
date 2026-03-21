# Task 003: Dashboard Filters and Actions

## Goal

Implement filter bar (search, state, status) and CTA buttons (Ingest Selected, Retry Failed, View Warnings) per PRD §§10.1, 11.1.

## Deliverables

- [ ] Search input: filter by district name (debounced)
- [ ] State dropdown filter
- [ ] Status filter (Not Ingested, Ingested, etc.)
- [ ] Ingest Selected button: enables when rows selected; triggers batch ingest (stub or wire to m13)
- [ ] Retry Failed button: visible when failed records exist; navigates or triggers retry
- [ ] View Warnings button: filter or navigate to warning records
- [ ] Filters persist in URL (query params) for shareable links

## Notes

- PRD §10.1: search by district name, filter by state, filter by ingestion status, filter by warning/error
- Ingest action may be placeholder until m13; Retry/View Warnings can filter list

## Verification

- Changing filters updates table; Ingest Selected disabled when no selection; Retry/View Warnings show when applicable
