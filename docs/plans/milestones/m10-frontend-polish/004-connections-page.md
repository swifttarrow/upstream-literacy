# Task 004: Connections Page

## Goal

Build connections page: tabs (My Connections, Pending Received, Pending Sent). Accept/decline on pending received. List connected users and pending requests.

## Deliverables

- [ ] Tabs: My Connections, Pending Received, Pending Sent
- [ ] Pending Received: cards with Accept/Decline; badge count
- [ ] Pending Sent: list of sent requests (pending)
- [ ] My Connections: list of connected users
- [ ] Call GET /connections?tab=...
- [ ] POST accept/reject for pending received
- [ ] Align with Connection Management design

## Notes

- Nav: connections accessible from main nav
- Badge on nav for pending received count (optional)

## Verification

- Receive request; accept; appears in My Connections
- Decline; removed from Pending Received
