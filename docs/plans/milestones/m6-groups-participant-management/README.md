# Milestone 6: Groups & Participant Management

## Overview

Extend conversation UX: join/leave groups, list participants, manage membership. Ensure group creation from connected users only and max 8 enforced in app and DB.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-6-groups--participant-management)

## Dependencies

- [x] Milestone 5 (Conversations & Real-Time Messaging)

## Changes Required

| Area | Changes |
|------|---------|
| **Participants** | GET /conversations/:id/participants; POST (invite); DELETE (leave) |
| **Invites** | Invite only connected users; enforce 8-participant cap before insert |
| **Group metadata** | Optional shared_problem_statement_id for contextual prompts |
| **Leave** | Set left_at; do not delete; preserve history |

## Success Criteria

### Automated Verification

- [x] Cannot add non-connected user to group
- [x] Cannot exceed 8 active participants (app + DB trigger)
- [x] Leave sets left_at; user no longer receives messages

### Manual Verification

- [x] User can add connected peers to group
- [x] User can leave group; history preserved
- [x] Contextual prompts (shared problem) available in compose

## Tasks

- [001-participants-list-api](./001-participants-list-api.md)
- [002-invite-participants-api](./002-invite-participants-api.md)
- [003-leave-group-api](./003-leave-group-api.md)
- [004-shared-problem-metadata](./004-shared-problem-metadata.md)
