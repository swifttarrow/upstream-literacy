# Task 001: District Preview API

## Goal

Expose an API that returns raw source values, normalized app values, and missing/quality indicators for a district candidate, per PRD §10.3.

## Deliverables

- [ ] `GET /admin/ingestion/candidates/:id/preview` (or `:ncesId/preview`)
- [ ] Response: identity, demographics, normalized matching fields, missing fields, source metadata
- [ ] Field-level indicators: source-provided, system-normalized, empty/missing, override
- [ ] Data quality warnings per PRD §10.7
- [ ] Auth: moderator/admin only

## Notes

- PRD §10.3: raw source values, normalized app values, field-level missing indicators, source metadata
- May aggregate from NCES fetch + district_attribute_definitions + existing district_effective_attribute_values if re-previewing ingested district
- PRD §16: suggested seed fields

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" /api/admin/ingestion/candidates/{id}/preview
# Expect structured preview with source/normalized/missing sections
```
