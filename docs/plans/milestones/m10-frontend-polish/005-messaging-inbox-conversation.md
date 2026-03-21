# Task 005: Messaging — Inbox & Conversation

## Goal

Build inbox and conversation view. List conversations; open conversation; compose and send messages; real-time updates via websocket. Shared problem banner when set.

## Deliverables

- [ ] Inbox: GET /conversations; list with preview, last message, timestamp
- [ ] Conversation view: messages area; GET /conversations/:id/messages (paginated)
- [ ] Compose: input, send button; POST message
- [ ] Websocket: connect; subscribe to conversation; display new messages in real time
- [ ] Shared context banner when shared_problem_statement_id set ("Shared problem: X")
- [ ] Direct and group conversations; group shows participant names
- [ ] New conversation: flow to start from connected users
- [ ] Align with Messaging & Conversations design

## Notes

- Real-time: subscribe on conversation open; unsubscribe on close
- Message bubbles: sent (right) vs received (left)

## Verification

- Send message; appears immediately for sender and recipient (two tabs)
- Shared problem banner displays when set
