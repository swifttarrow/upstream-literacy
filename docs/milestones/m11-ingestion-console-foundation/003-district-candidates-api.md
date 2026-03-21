# Task 003: District Candidates API

## Goal

Expose an API for moderators to list district candidates with status, filters, and search per PRD §§10.1, 10.2.

## Deliverables

- [x] `GET /admin/ingestion/candidates` with query params: search, state, status, page, limit
- [x] Response: list of candidates with name, state, nces_id, status, missing_data_indicator, last_refresh
- [x] Status values: NotIngested, ReadyToIngest, InProgress, Ingested, IngestedWithWarnings, Failed
- [x] Pagination and total count
- [x] Auth: moderator or admin only

## Notes

- PRD §§10.2, 10.3: each row shows district name, state, NCES id, completeness score, missing data indicator
- Integrate with district_candidates seed and districts table for ingested records

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" /api/admin/ingestion/candidates?state=CA
# Expect filtered list; 403 for non-moderator
```
