# Task 001: Ingestion Dashboard Layout

## Goal

Create the ingestion dashboard page layout with upload area, summary cards (completeness), and recent jobs panel per PRD §§10.1, 11.1.

## Deliverables

- [x] Admin route: `/admin/ingestion` (or `/admin/districts/ingestion`)
- [ ] Upload area: drag-and-drop or file picker for NCES CCD CSV; link to NCES download page
- [x] Top summary cards: Total Districts, Fully Complete, Partial, Incomplete (counts from API)
- [x] Recent jobs panel: last N upload/ingestion jobs with status, timestamps, outcome summary
- [x] Protected: moderator/admin only
- [x] Responsive layout; loading and error states

## Notes

- PRD §11.1: upload area, summary cards (completeness-based), recent jobs panel
- May need `GET /admin/ingestion/summary` and `GET /admin/ingestion/jobs` (or combine)
- Reuse admin layout/nav from reports page if applicable

## Verification

- Moderator navigates to /admin/ingestion; sees upload area, summary cards, and recent jobs; counts match API
