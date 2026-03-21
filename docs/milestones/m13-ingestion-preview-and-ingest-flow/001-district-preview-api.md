# Task 001: District Preview API

## Goal

Expose an API that returns raw source values, normalized app values, and missing/quality indicators for a district candidate, per PRD §10.3.

## Deliverables

- [x] `GET /admin/ingestion/candidates/:id/preview` (or `:ncesId/preview`)
- [x] Response: identity, demographics, normalized matching fields, missing fields, source metadata
- [x] Field-level indicators: source-provided, system-normalized, empty/missing, override
- [x] Data quality warnings per PRD §10.7
- [x] Auth: moderator/admin only

## Notes

- PRD §10.3: raw source values, normalized app values, field-level missing indicators, source metadata
- Returns source and normalized values; completeness score; used for district detail (view). Edit flow in m15.
- PRD §16: suggested seed fields

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" /api/admin/ingestion/candidates/{id}/preview
# Expect structured preview with source/normalized/missing sections
```
