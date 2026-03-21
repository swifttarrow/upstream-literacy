# Task 004: Inbox — Conversations List

## Goal

Implement `GET /conversations` returning user's active conversations, ordered by updated_at (most recent first). Include preview/last message if convenient.

## Deliverables

- [ ] `GET /conversations`: list conversations where user is participant; order by conversation.updated_at DESC
- [ ] Include: conversation id, type, participant summary, last message preview, updated_at
- [ ] Pagination
- [ ] Exclude conversations user has left (left_at set)

## Notes

- conversation_participants links user to conversation
- Join messages for last message; or store last_message_id on conversation if denormalized

## Verification

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/conversations
# Returns list ordered by recency
```
