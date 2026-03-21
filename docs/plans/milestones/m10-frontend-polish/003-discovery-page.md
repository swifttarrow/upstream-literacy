# Task 003: Discovery Page

## Goal

Build discovery page: filters (problem, district, role, geography), match cards with exact/close labels, match explanations, connection status, Connect and View Profile actions.

## Deliverables

- [ ] Sidebar filters: problem, district size, geography, role; reset
- [ ] Search by name, district, or challenge
- [ ] Match cards: avatar, name, role, district; match badge (Exact/Close); match %; explanation text
- [ ] Connection status: none, pending_sent, pending_received, connected
- [ ] Connect button (sends request when none); View Profile link
- [ ] Call GET /discovery/matches with filter params
- [ ] Align with Discovery & Matching design

## Notes

- Match explanations from API
- Cold start: close matches and demo profiles labeled

## Verification

- Filter; results update
- Connect; button state changes; recipient sees in Connections
