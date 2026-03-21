# Task 002: Profile & Onboarding

## Goal

Build profile edit and onboarding flow: district selection, role, primary/secondary problems, bio. Multi-step if needed. Surface profile_completed_at gate.

## Deliverables

- [ ] Profile edit page: GET/PATCH /users/me
- [ ] District selector: search/select from GET /districts
- [ ] Problem selection: primary (required) + secondaries from GET /problem-statements
- [ ] Bio text area (optional)
- [ ] Onboarding flow: step indicator; continue until district + primary problem set
- [ ] Gate: if profile incomplete, show prompt or block messaging entry points
- [ ] Align with Profile Onboarding design

## Notes

- Soft gate: allow discovery before profile complete
- Clear "complete your profile" CTA when incomplete

## Verification

- Complete profile; profile_completed_at set
- Incomplete profile; messaging entry points show gate message
