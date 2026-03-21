# Task 001: Reports API

## Goal

Implement `POST /reports` for users to report content. Target types: user, message, conversation. Auth required.

## Deliverables

- [ ] `POST /reports`: body `{ target_type: "user"|"message"|"conversation", target_id: uuid, reason_code: string, details?: string }`
- [ ] Validate target exists and is accessible (e.g. user can report message in conversation they're in)
- [ ] Insert into reports table with reporter user_id
- [ ] reason_code from predefined list (spam, harassment, etc.)
- [ ] Zod validation
- [ ] Return 201 with report id

## Notes

- Schema: reports has target_type, target_id (polymorphic)
- Reason codes: align with design (spam, harassment, etc.)

## Verification

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -d '{"target_type":"message","target_id":"...","reason_code":"spam"}' \
  http://localhost:3000/reports
# 201 + report id
```
