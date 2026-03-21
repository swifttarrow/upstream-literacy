# Milestone 5: Conversations & Real-Time Messaging

## Overview

Enable 1:1 and group conversations. Enforce: messaging only between connected users; profile completion required. Real-time delivery via websockets.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-5-conversations--real-time-messaging)

## Dependencies

- [x] Milestone 4 (Discovery, Matching & Connections)

## Changes Required

| Area | Changes |
|------|---------|
| **Conversations** | POST /conversations (direct or group); resolve/create conversation_direct_pairs for 1:1 |
| **Messaging gate** | Require profile_completed_at; users must be connected |
| **Messages** | POST/GET messages; pagination |
| **Websockets** | Connect with auth; subscribe to conversation channels; broadcast new messages |
| **Inbox** | GET /conversations (user's active, ordered by updated_at) |
| **Group creation** | Participants must be connected; enforce max 8 (DB trigger + app) |
| **Validation** | Zod for message body, participant list |

## Success Criteria

### Automated Verification

- [x] Messaging blocked when profile incomplete or users not connected
- [x] Direct conversation idempotent for same user pair
- [x] Group creation fails when > 8 participants or non-connected user included
- [x] Websocket delivers new message to participants

### Manual Verification

- [x] User can start 1:1 and group conversations with connected peers
- [x] Messages appear in real time
- [x] Conversation history loads correctly
- [x] Soft-deleted messages hidden from UI

## Tasks

- [001-conversation-creation-api](./001-conversation-creation-api.md)
- [002-messaging-gate-enforcement](./002-messaging-gate-enforcement.md)
- [003-messages-crud-websocket](./003-messages-crud-websocket.md)
- [004-inbox-conversations-list](./004-inbox-conversations-list.md)
- [005-group-creation-validation](./005-group-creation-validation.md)
