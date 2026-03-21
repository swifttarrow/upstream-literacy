# Task 001: Ingestion Dashboard Layout

## Goal

Create the ingestion dashboard page layout with summary cards and recent jobs panel per PRD §11.1.

## Deliverables

- [ ] Admin route: `/admin/ingestion` (or `/admin/districts/ingestion`)
- [ ] Top summary cards: Not Ingested, Ingested, Warnings, Failed (counts from API)
- [ ] Recent jobs panel: last N ingestion jobs with status, timestamps, outcome summary
- [ ] Protected: moderator/admin only
- [ ] Responsive layout; loading and error states

## Notes

- PRD §11.1: summary cards, recent jobs panel
- May need `GET /admin/ingestion/summary` and `GET /admin/ingestion/jobs` (or combine)
- Reuse admin layout/nav from reports page if applicable

## Verification

- Moderator navigates to /admin/ingestion; sees summary cards and recent jobs; counts match API
