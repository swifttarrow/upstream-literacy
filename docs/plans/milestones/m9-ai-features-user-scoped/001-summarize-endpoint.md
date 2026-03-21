# Task 001: Summarize Endpoint

## Goal

Implement `POST /conversations/:id/summarize` to generate a conversation summary via LLM. Store in `user_ai_artifacts`. Only for participants.

## Deliverables

- [ ] `POST /conversations/:id/summarize`: verify requester is participant; fetch user-visible messages
- [ ] Call LLM with messages; prompt for summary
- [ ] Store result in user_ai_artifacts (user_id, conversation_id, kind: "summary", content, metadata with prompt_version)
- [ ] Return summary to client
- [ ] 403 if non-participant
- [ ] Exclude soft-deleted messages

## Notes

- User-visible = messages in conversation user participates in
- Schema: user_ai_artifacts per db-schema.md

## Verification

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/conversations/:id/summarize
# 200 + summary
# Non-participant: 403
```
