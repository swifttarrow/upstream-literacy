# Task 005: Demo Seed Script

## Goal

Optional script to seed demo districts and users (`is_demo_profile = true`) for cold-start testing.

## Deliverables

- [ ] Seed script: create demo districts, demo users with `is_demo_profile = true`
- [ ] Demo users have completed profiles (district, primary problem)
- [ ] Idempotent; can re-run safely
- [ ] `npm run seed:demo` or similar

## Notes

- PRD cold start: use seeded/demo profiles when exact matches scarce
- Label demo profiles clearly in discovery (e.g. `is_demo_profile` in API response)

## Verification

```bash
npm run seed:demo
# Query users where is_demo_profile = true; expect rows
```
