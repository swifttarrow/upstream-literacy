# Task 002: Suggest Actions Endpoint

## Goal

Implement `POST /conversations/:id/suggest-actions` to generate suggested next steps via LLM. Store in `user_ai_artifacts`. Only for participants.

## Deliverables

- [ ] `POST /conversations/:id/suggest-actions`: verify requester is participant; fetch messages
- [ ] Call LLM with conversation context; prompt for 2-5 suggested next steps
- [ ] Store in user_ai_artifacts (kind: "suggested_actions")
- [ ] Return suggested actions to client
- [ ] 403 if non-participant

## Notes

- Suggested actions: e.g. "Share resource", "Schedule follow-up", "Ask about X"
- Prompt versioning in metadata for reproducibility

## Verification

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/conversations/:id/suggest-actions
# 200 + actions array
```
