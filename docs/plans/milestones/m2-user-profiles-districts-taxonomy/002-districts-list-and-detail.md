# Task 002: Districts List and Detail

## Goal

Implement `GET /districts` (list with optional filters) and `GET /districts/:id` (detail), reading from `districts` and `district_effective_attribute_values`.

## Deliverables

- [ ] `GET /districts`: query params for filters (e.g. state, enrollment range); paginate; return list with basic attributes
- [ ] `GET /districts/:id`: return district with effective attribute values, provenance where available
- [ ] Zod schemas for query params
- [ ] Surface source/timestamp from effective values when present

## Notes

- `district_effective_attribute_values` holds resolved current values; `district_ingestion_events` and `district_admin_overrides` provide provenance
- Phase 3 will add ingestion; for now attributes may be empty

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/districts?state=CA"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/districts/:id"
```
