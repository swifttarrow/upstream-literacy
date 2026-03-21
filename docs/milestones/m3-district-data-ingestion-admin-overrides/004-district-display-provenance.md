# Task 004: District Display — Provenance

## Goal

Update `GET /districts/:id` (and list if needed) to surface provenance: `last_ingestion_event_id`, `last_override_id`, source, timestamp where relevant.

## Deliverables

- [ ] District detail response includes provenance fields from `district_effective_attribute_values`
- [ ] Each attribute value can indicate source (ingestion vs override) and timestamp
- [ ] Response shape documented or typed

## Notes

- PRD: "Display source + timestamp" for district data
- Effective values table has provenance pointers

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/districts/:id
# Response includes provenance for attributes
```
