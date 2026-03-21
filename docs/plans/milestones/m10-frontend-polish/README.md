# Milestone 10: Frontend & Polish

## Overview

Web frontend for all MVP flows: auth, profile, discovery, messaging, groups, notifications, moderation (admin). Responsive, accessible, aligned with NFRs (fast onboarding, clear match explanations).

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-10-frontend--polish)

## Dependencies

- [ ] Milestone 2+ (can start after profiles; iterate with each backend phase)
- [ ] All backend milestones for full E2E

## Changes Required

| Area | Changes |
|------|---------|
| **Auth** | Login, register, session handling |
| **Profile** | Edit profile, district selection, problem selection |
| **Discovery** | Match list with filters, exact/close labels, explanations, connection status |
| **Connections** | Send/accept connection requests, list connections and pending |
| **Messaging** | Inbox, conversation view, compose, real-time updates |
| **Groups** | Create group, add/remove participants, group conversation view |
| **Notifications** | Bell/indicator, list, mark read |
| **Moderation** | Admin/moderator: report queue, actions |
| **Polish** | Loading states, error handling, accessibility, performance |

## Success Criteria

### Automated Verification

- [ ] `npm run build` succeeds
- [ ] E2E or integration tests for critical paths (optional)
- [ ] Lighthouse/accessibility checks pass (if configured)

### Manual Verification

- [ ] End-to-end user journey: signup → profile → discover → connect → message → group
- [ ] Match explanations clear and useful
- [ ] Real-time messaging feels responsive
- [ ] Moderation workflow usable by moderator

## Tasks

- [001-auth-pages](./001-auth-pages.md)
- [002-profile-onboarding](./002-profile-onboarding.md)
- [003-discovery-page](./003-discovery-page.md)
- [004-connections-page](./004-connections-page.md)
- [005-messaging-inbox-conversation](./005-messaging-inbox-conversation.md)
- [006-groups-ui](./006-groups-ui.md)
- [007-notifications-ui](./007-notifications-ui.md)
- [008-moderation-admin-ui](./008-moderation-admin-ui.md)
- [009-polish-accessibility](./009-polish-accessibility.md)
