# Task 002: Discovery Matches API

## Goal

Implement `GET /discovery/matches` with query params for problem, district filters, role, geography. Return suggested peers with connectionStatus. Exclude suspended, non-approved, profile-incomplete users.

## Deliverables

- [ ] `GET /discovery/matches`: query params `problemId`, `districtId`, `professionalRole`, `stateRegion`, etc.
- [ ] Filter: membership_status = approved, suspended_until IS NULL, profile_completed_at IS NOT NULL
- [ ] Exclude self
- [ ] For each result: include `connectionStatus` (none | pending_sent | pending_received | connected) by checking user_connections
- [ ] Zod schemas for query params
- [ ] Pagination support

## Notes

- Primary filter: problem (user_problem_selections)
- Secondary: district attributes, professional_role, geography (districts.state etc.)

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/discovery/matches?problemId=..."
# Response includes connectionStatus for each match
```
