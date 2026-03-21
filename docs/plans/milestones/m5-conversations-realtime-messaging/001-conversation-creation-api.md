# Task 001: Conversation Creation API

## Goal

Implement `POST /conversations` for direct and group conversations. For 1:1, resolve/create `conversation_direct_pairs`; ensure idempotent for same user pair.

## Deliverables

- [ ] `POST /conversations`: body `{ type: "direct" | "group", participant_ids: [...] }`
- [ ] Direct: participant_ids = [other_user_id]; lookup or create conversation_direct_pairs; return existing if present
- [ ] Group: participant_ids = array of connected user ids; create conversation + conversation_participants
- [ ] Return conversation with id, type, participant list
- [ ] Zod validation for body

## Notes

- conversation_direct_pairs: (user_low_id, user_high_id) uniqueness
- One conversation per direct pair

## Verification

```bash
# Create direct conv: same pair twice returns same conversation id
# Create group conv: new conversation with participants
```
