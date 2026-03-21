# Task 006: Groups UI

## Goal

Build groups page: My Groups, Discover Groups tabs. Create group flow. Group cards with View, Leave. Add participants from connected users.

## Deliverables

- [ ] Groups page: My Groups, Discover Groups tabs
- [ ] Create Group button; modal or flow to name group, select connected users (max 8)
- [ ] Group cards: name, description, participant count, shared problem tag; View, Leave
- [ ] View: navigate to group conversation
- [ ] Leave: confirm; call DELETE participants/me
- [ ] Invite: add participants from connected users (when in group)
- [ ] Align with Group Creation & Management design

## Notes

- Create group: POST /conversations with type=group, participant_ids
- Participants from GET /connections?tab=connected

## Verification

- Create group; appears in My Groups; open conversation
- Leave group; removed from My Groups; no new messages
