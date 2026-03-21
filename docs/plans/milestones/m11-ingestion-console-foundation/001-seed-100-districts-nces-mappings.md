# Task 001: Seed 100 Districts with NCES Mappings

## Goal

Create and load the curated 100-district seed list with NCES identifiers, mapped from the PRD §10.2 approved list (30 large/urban, 40 mid-size/suburban, 30 small/rural).

## Deliverables

- [ ] Seed file (JSON or CSV) with 100 districts: name, state, nces_district_id, district_type (large/mid/small), locale classification
- [ ] Script to load seed into `district_candidates` or equivalent table (may extend `districts` with candidate status)
- [ ] NCES ids mapped for all 100 districts (manual research or use NCES lookup)
- [ ] Idempotent load; `npm run seed:district-candidates` or similar

## Notes

- PRD §§10.2, 16 list the 100 districts and expected fields
- May need NCES CCD API or CSV download to resolve identifiers
- Consider `district_candidates` table: id, nces_id, name, state, district_type, status, created_at

## Verification

```bash
npm run seed:district-candidates
# Query: expect 100 rows with nces_district_id populated
```
