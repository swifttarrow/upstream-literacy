# Task 003: AI Artifacts Retrieval

## Goal

Implement `GET /conversations/:id/ai-artifacts` to retrieve user's stored AI artifacts (summaries, suggested actions). Enforce participation.

## Deliverables

- [ ] `GET /conversations/:id/ai-artifacts`: verify requester is participant
- [ ] Return artifacts for this user and conversation (kind, content, created_at, metadata)
- [ ] Filter by kind if query param provided
- [ ] Order by created_at desc
- [ ] 403 if non-participant

## Notes

- User-scoped: only artifacts for requesting user
- Frontend can display in Summarize/suggest-actions UI

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/conversations/:id/ai-artifacts
# Returns list of artifacts
```
