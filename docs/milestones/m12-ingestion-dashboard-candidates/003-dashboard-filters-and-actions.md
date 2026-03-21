# Task 003: Dashboard Filters and Actions

## Goal

Implement filter bar (search, state, completeness) and CTA buttons (Upload New NCES Data, Retry Failed, View Low-Completeness) per PRD §§10.1, 11.1.

## Deliverables

- [x] Search input: filter by district name (debounced)
- [x] State dropdown filter
- [x] Completeness filter (full, partial, minimal / incomplete)
- [ ] Upload New NCES Data button: opens upload flow or file picker
- [x] Retry Failed button: visible when failed records exist; navigates or triggers retry
- [x] View Low-Completeness button: filter or navigate to low-completeness records
- [x] Filters persist in URL (query params) for shareable links

## Notes

- PRD §10.1: search by district name, filter by state, filter by completeness level, filter by warning/error
- Upload triggers m11/m13 upload flow; Retry/View Low-Completeness filter list

## Verification

- Changing filters updates table; Upload opens upload flow; Retry/View Low-Completeness show when applicable
