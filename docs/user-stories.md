# User Stories: District Community Matching Platform

**Source:** PRD (§1–14), Milestones (m1–m10)  
**Generated:** 2025-03-21

---

## By Role

### District Staff

#### Authentication & Access

- **US-001** As a **district staff member**, I want to **register with email, password, and full name** so that **I can create an account and access the platform**.
  - Source: PRD §8.1, m1/004-auth-routes-register-login
  - Priority: Must-have
  - Acceptance: Given valid email and password When I submit registration Then I receive a user account and can log in

- **US-002** As a **district staff member**, I want to **log in with my credentials** so that **I can access my account and the platform**.
  - Source: PRD §8.1, m1/004-auth-routes-register-login
  - Priority: Must-have
  - Acceptance: Given valid credentials When I submit login Then I receive a session token and am authenticated

- **US-003** As a **district staff member**, I want to **see my current session and user info** so that **I know I'm logged in and my identity is confirmed**.
  - Source: PRD §8.1, m1/006-auth-me-verification
  - Priority: Must-have
  - Acceptance: Given I am logged in When I call GET /auth/me Then I receive my user object (excluding password)

- **US-004** As a **district staff member**, I want to **receive clear errors for invalid credentials** so that **I can correct my login attempt**.
  - Source: PRD §8.1, m1/004-auth-routes-register-login
  - Priority: Must-have
  - Acceptance: Given invalid email or password When I submit login Then I receive 401 with descriptive message

- **US-005** As a **district staff member**, I want to **be blocked from login when my account is suspended** so that **I understand why I cannot access the platform**.
  - Source: PRD §8.9, m7/004-suspension-login-messaging-block
  - Priority: Must-have
  - Acceptance: Given my account has suspended_until > now When I attempt login Then I receive 403 with "Account suspended until X"

- **US-006** As a **district staff member**, I want to **be redirected to login when my session expires** so that **I can re-authenticate to continue**.
  - Source: PRD §8.1, m10/009-polish-accessibility
  - Priority: Should-have
  - Acceptance: Given my token is expired When I access a protected route Then I am redirected to login with clear message

- **US-006a** As a **district staff member**, I want to **log out** so that **I can securely end my session**.
  - Source: PRD §8.1, m10/001-auth-pages
  - Priority: Must-have
  - Acceptance: Given I am logged in When I log out Then my token is cleared and I am redirected to login

#### User Profiles

- **US-007** As a **district staff member**, I want to **view and edit my profile (name, role, bio, district, problems)** so that **peers can discover and connect with me based on accurate information**.
  - Source: PRD §8.2, m2/001-users-me-profile-crud
  - Priority: Must-have
  - Acceptance: Given I am logged in When I PATCH /users/me with valid data Then my profile is updated and returned

- **US-008** As a **district staff member**, I want to **select my district from a searchable list** so that **I can associate myself with the correct district**.
  - Source: PRD §8.2, m2/002-districts-list-and-detail, m10/002-profile-onboarding
  - Priority: Must-have
  - Acceptance: Given I am on profile edit When I search districts Then I can select my district and it is saved

- **US-009** As a **district staff member**, I want to **choose a primary problem and optional secondary problems** so that **I am matched with peers facing similar challenges**.
  - Source: PRD §8.2, §8.5, m2/001-users-me-profile-crud, m2/003-taxonomy-endpoints
  - Priority: Must-have
  - Acceptance: Given I select district + primary problem When I save Then profile_completed_at is set and I can message

- **US-010** As a **district staff member**, I want to **browse the problem taxonomy by category** so that **I can find the problem statements that match my situation**.
  - Source: PRD §8.4, m2/003-taxonomy-endpoints
  - Priority: Must-have
  - Acceptance: Given I am logged in When I request problem statements by category Then I receive active problems only

- **US-011** As a **district staff member**, I want to **see a prompt to complete my profile when it's incomplete** so that **I know what I need to do before messaging**.
  - Source: PRD §7 (Onboarding), m2/005-messaging-gate-stub, m10/002-profile-onboarding
  - Priority: Must-have
  - Acceptance: Given profile_completed_at is null When I attempt messaging action Then I receive 403 with "Complete your profile to message peers"

- **US-012** As a **district staff member**, I want to **browse discovery before completing my profile** so that **I can explore the platform and decide if I want to invest in profile completion**.
  - Source: PRD §7 (Onboarding), m2/005-messaging-gate-stub
  - Priority: Must-have
  - Acceptance: Given profile incomplete When I access discovery Then I can view matches (messaging blocked)

#### District Data & Discovery

- **US-013** As a **district staff member**, I want to **view district details with attributes and provenance** so that **I understand the data source and recency**.
  - Source: PRD §8.3, m2/002-districts-list-and-detail, m3/004-district-display-provenance
  - Priority: Must-have
  - Acceptance: Given a district When I view its detail Then I see effective attributes with source and timestamp

- **US-014** As a **district staff member**, I want to **discover peers by filtering by problem, district attributes, role, and geography** so that **I find relevant peers efficiently**.
  - Source: PRD §8.5, §6, m4/002-discovery-matches-api
  - Priority: Must-have
  - Acceptance: Given I apply filters When I request matches Then I receive ranked results matching my criteria

- **US-015** As a **district staff member**, I want to **see why I am matched with someone (match explanation)** so that **I can decide whether to connect**.
  - Source: PRD §8.5, m4/003-matching-ranking-logic, m10/003-discovery-page
  - Priority: Must-have
  - Acceptance: Given a match When I view it Then I see explanation text (e.g. "Both focused on K-3 reading intervention")

- **US-016** As a **district staff member**, I want to **see exact vs close match labels** so that **I understand the strength of each match**.
  - Source: PRD §8.5, m4/003-matching-ranking-logic, m10/003-discovery-page
  - Priority: Must-have
  - Acceptance: Given match results When I view them Then each has matchType (exact | close)

- **US-017** As a **district staff member**, I want to **see connection status (none, pending sent, pending received, connected) on each match** so that **I know what actions I can take**.
  - Source: PRD §8.5, m4/002-discovery-matches-api, m10/003-discovery-page
  - Priority: Must-have
  - Acceptance: Given a match When I view it Then I see connectionStatus and appropriate actions

- **US-018** As a **district staff member**, I want to **see close matches when exact matches are scarce** so that **I still have options during cold start**.
  - Source: PRD §7 (Cold Start), m4/003-matching-ranking-logic
  - Priority: Must-have
  - Acceptance: Given sparse exact matches When I search Then close matches and demo profiles appear

- **US-018a** As a **district staff member**, I want to **view the full profile of a discovered peer** so that **I can decide whether to send a connection request**.
  - Source: PRD §8.5, m10/003-discovery-page (View Profile action)
  - Priority: Must-have
  - Acceptance: Given a match When I click View Profile Then I see their full profile (name, role, district, bio, problems)

#### Connections

- **US-019** As a **district staff member**, I want to **send a connection request to any discovered peer** so that **I can initiate a professional relationship**.
  - Source: PRD §8.5, §8.6, §6, m4/004-connections-crud-api, m10/003-discovery-page
  - Priority: Must-have
  - Acceptance: Given a match with connectionStatus none When I click Connect Then a pending request is created

- **US-020** As a **district staff member**, I want to **accept incoming connection requests** so that **I can connect with peers who want to collaborate**.
  - Source: PRD §8.6, m4/004-connections-crud-api, m10/004-connections-page
  - Priority: Must-have
  - Acceptance: Given I have a pending received request When I accept Then we become connected and can message

- **US-021** As a **district staff member**, I want to **reject incoming connection requests** so that **I can decline connections I don't want**.
  - Source: PRD §8.6, m4/004-connections-crud-api, m10/004-connections-page
  - Priority: Must-have
  - Acceptance: Given I have a pending received request When I reject Then the request is resolved and removed

- **US-022** As a **district staff member**, I want to **view my connections, pending sent, and pending received in separate tabs** so that **I can manage my connection lifecycle**.
  - Source: PRD §8.6, m4/004-connections-crud-api, m10/004-connections-page
  - Priority: Must-have
  - Acceptance: Given I am logged in When I view Connections page Then I see tabs for connected, pending sent, pending received

- **US-023** As a **district staff member**, I want to **be prevented from sending duplicate connection requests** so that **I don't accidentally spam a peer**.
  - Source: PRD §8.6, m4/004-connections-crud-api
  - Priority: Must-have
  - Acceptance: Given I already sent a request to user B When I try again Then I receive 400/409

#### Messaging

- **US-024** As a **district staff member**, I want to **start a 1:1 conversation with a connected peer** so that **I can exchange messages directly**.
  - Source: PRD §8.7, §6, m5/001-conversation-creation-api, m10/005-messaging-inbox-conversation
  - Priority: Must-have
  - Acceptance: Given we are connected When I start a direct conversation Then a conversation is created or existing returned

- **US-025** As a **district staff member**, I want to **send and receive messages in real time** so that **conversations feel responsive**.
  - Source: PRD §8.7, m5/003-messages-crud-websocket, m10/005-messaging-inbox-conversation
  - Priority: Must-have
  - Acceptance: Given two users in a conversation When one sends a message Then the other sees it immediately via websocket

- **US-026** As a **district staff member**, I want to **view conversation history with pagination** so that **I can scroll back through past messages**.
  - Source: PRD §8.7, m5/003-messages-crud-websocket, m5/004-inbox-conversations-list
  - Priority: Must-have
  - Acceptance: Given a conversation When I load messages Then I receive paginated history (soft-deleted hidden)

- **US-027** As a **district staff member**, I want to **create a group conversation with up to 8 connected peers** so that **I can collaborate in small groups**.
  - Source: PRD §8.8, §7 (Messaging), m5/001-conversation-creation-api, m5/005-group-creation-validation
  - Priority: Must-have
  - Acceptance: Given I am connected to 5 users When I create a group with 5 participants Then group is created

- **US-028** As a **district staff member**, I want to **be blocked from messaging when my profile is incomplete** so that **I complete my profile first**.
  - Source: PRD §7 (Onboarding), m5/002-messaging-gate-enforcement
  - Priority: Must-have
  - Acceptance: Given profile_completed_at is null When I try to create conversation Then I receive 403

- **US-029** As a **district staff member**, I want to **be blocked from messaging when I'm not connected to the other user** so that **messaging only happens between vetted connections**.
  - Source: PRD §8.6, m5/002-messaging-gate-enforcement
  - Priority: Must-have
  - Acceptance: Given we are not connected When I try to create direct conversation Then I receive 403

- **US-030** As a **district staff member**, I want to **see a shared problem banner in group conversations** so that **I have context for the discussion**.
  - Source: PRD §8.7, m6/004-shared-problem-metadata, m10/005-messaging-inbox-conversation
  - Priority: Should-have
  - Acceptance: Given group has shared_problem_statement_id When I view conversation Then I see "Shared problem: X" banner

- **US-031** As a **district staff member**, I want to **view my inbox with conversations ordered by recency** so that **I can easily find active conversations**.
  - Source: PRD §8.7, m5/004-inbox-conversations-list, m10/005-messaging-inbox-conversation
  - Priority: Must-have
  - Acceptance: Given I have conversations When I open inbox Then I see them ordered by updated_at with preview

- **US-032** As a **district staff member**, I want to **be blocked from sending messages when my account is suspended** so that **I cannot use the platform during suspension**.
  - Source: PRD §8.9, m7/004-suspension-login-messaging-block
  - Priority: Must-have
  - Acceptance: Given I am suspended When I attempt to send message Then I receive 403 "Account suspended until X"

#### Groups & Participants

- **US-033** As a **district staff member**, I want to **add connected peers to a group conversation** so that **I can expand collaboration**.
  - Source: PRD §8.8, m6/002-invite-participants-api, m10/006-groups-ui
  - Priority: Must-have
  - Acceptance: Given I am in a group When I invite a connected user (within 8 cap) Then they join

- **US-034** As a **district staff member**, I want to **leave a group** so that **I can exit conversations I no longer want to participate in**.
  - Source: PRD §8.8, m6/003-leave-group-api, m10/006-groups-ui
  - Priority: Must-have
  - Acceptance: Given I am in a group When I leave Then I no longer receive messages; history preserved

- **US-035** As a **district staff member**, I want to **view participants in a group conversation** so that **I know who is in the group**.
  - Source: PRD §8.8, m6/001-participants-list-api
  - Priority: Must-have
  - Acceptance: Given I am a participant When I request participants list Then I see active members

- **US-036** As a **district staff member**, I want to **be prevented from adding non-connected users to a group** so that **groups stay within my trusted network**.
  - Source: PRD §7 (Group Formation), m6/002-invite-participants-api
  - Priority: Must-have
  - Acceptance: Given user B is not connected When I try to add B to group Then I receive 403

- **US-037** As a **district staff member**, I want to **see an error when trying to add more than 8 participants** so that **I understand the group size limit**.
  - Source: PRD §7 (Messaging), m5/005-group-creation-validation, m6/002-invite-participants-api
  - Priority: Must-have
  - Acceptance: Given group has 7 participants When I try to add 2 more Then I receive 400

#### Notifications

- **US-038** As a **district staff member**, I want to **receive a notification when I get a new message** so that **I know to check my inbox**.
  - Source: PRD §8.10, m8/001-notification-creation-hooks, m10/007-notifications-ui
  - Priority: Must-have
  - Acceptance: Given someone sends me a message When it is sent Then I receive a notification (type new_message)

- **US-039** As a **district staff member**, I want to **receive a notification when someone sends me a connection request** so that **I can respond promptly**.
  - Source: PRD §8.10, m8/001-notification-creation-hooks, m10/007-notifications-ui
  - Priority: Must-have
  - Acceptance: Given user B sends me a connection request When it is created Then I receive notification (type connection_request)

- **US-040** As a **district staff member**, I want to **receive a notification when my connection request is accepted** so that **I know I can start messaging**.
  - Source: PRD §8.10, m8/001-notification-creation-hooks, m10/007-notifications-ui
  - Priority: Must-have
  - Acceptance: Given user B accepts my request When they accept Then I receive notification (type connection_accepted)

- **US-041** As a **district staff member**, I want to **see an unread count on the notifications bell** so that **I know how many new items I have**.
  - Source: PRD §8.10, m8/002-notifications-api, m10/007-notifications-ui
  - Priority: Must-have
  - Acceptance: Given I have 3 unread notifications When I view nav Then bell shows badge "3"

- **US-042** As a **district staff member**, I want to **mark notifications as read** so that **I can clear my unread count**.
  - Source: PRD §8.10, m8/002-notifications-api, m10/007-notifications-ui
  - Priority: Must-have
  - Acceptance: Given unread notification When I mark read Then read_at is set and count decreases

- **US-043** As a **district staff member**, I want to **click a notification and navigate to the relevant page** so that **I can act on it quickly**.
  - Source: PRD §8.10, m10/007-notifications-ui
  - Priority: Should-have
  - Acceptance: Given connection_request notification When I click Then I navigate to Connections pending tab

#### Reporting & Moderation

- **US-044** As a **district staff member**, I want to **report content (user, message, conversation)** so that **I can flag inappropriate behavior**.
  - Source: PRD §8.9, m7/001-reports-api, m10/008-moderation-admin-ui
  - Priority: Must-have
  - Acceptance: Given I see reportable content When I report with reason Then a report is created and I see confirmation

#### AI Features

- **US-045** As a **district staff member**, I want to **request a summary of a conversation I'm in** so that **I can quickly catch up on long threads**.
  - Source: PRD §8.11, m9/001-summarize-endpoint
  - Priority: Should-have
  - Acceptance: Given I am a participant When I request summarize Then I receive a summary and it is stored

- **US-046** As a **district staff member**, I want to **request suggested next steps for a conversation** so that **I get ideas for how to move forward**.
  - Source: PRD §8.11, m9/002-suggest-actions-endpoint
  - Priority: Should-have
  - Acceptance: Given I am a participant When I request suggest-actions Then I receive 2-5 suggested actions

- **US-047** As a **district staff member**, I want to **view my saved AI artifacts (summaries, suggested actions)** so that **I can reference them later**.
  - Source: PRD §8.11, m9/003-ai-artifacts-retrieval
  - Priority: Should-have
  - Acceptance: Given I have artifacts for a conversation When I request ai-artifacts Then I see them (non-participant gets 403)

- **US-048** As a **district staff member**, I want to **see a rate limit message when I exceed AI usage** so that **I know to wait before trying again**.
  - Source: PRD §8.11, m9/004-llm-integration-rate-limit
  - Priority: Should-have
  - Acceptance: Given I exceeded 10/hour When I request summarize Then I receive 429

#### Polish & UX

- **US-049** As a **district staff member**, I want to **see loading states while data is fetching** so that **I know the app is working**.
  - Source: PRD §9 (Usability), m10/009-polish-accessibility
  - Priority: Should-have
  - Acceptance: Given slow network When I load a page Then I see skeleton or spinner

- **US-050** As a **district staff member**, I want to **see clear error messages when something goes wrong** so that **I understand what happened and what to do**.
  - Source: PRD §9 (Usability), m10/009-polish-accessibility
  - Priority: Should-have
  - Acceptance: Given API returns error When displayed Then I see user-friendly message (not raw error)

- **US-051** As a **district staff member**, I want to **navigate the app with keyboard** so that **I can use it without a mouse**.
  - Source: PRD §9 (Usability), m10/009-polish-accessibility
  - Priority: Nice-to-have
  - Acceptance: Given I use Tab When I navigate Then no keyboard traps and focus is visible

---

### Moderator

- **US-052** As a **moderator**, I want to **view the reports queue with filters (status)** so that **I can triage and prioritize work**.
  - Source: PRD §8.9, m7/002-moderator-reports-queue, m10/008-moderation-admin-ui
  - Priority: Must-have
  - Acceptance: Given I have moderator role When I open moderation Then I see reports; member gets 403

- **US-053** As a **moderator**, I want to **see report metadata (target, reporter, reason, details)** so that **I can assess the report**.
  - Source: PRD §8.9, m7/002-moderator-reports-queue
  - Priority: Must-have
  - Acceptance: Given a report When I view it Then I see target info, reporter, reason (message body only if conversation reported)

- **US-054** As a **moderator**, I want to **dismiss a report** so that **I can close reports that don't warrant action**.
  - Source: PRD §8.9, m7/003-moderation-actions-api, m10/008-moderation-admin-ui
  - Priority: Must-have
  - Acceptance: Given a report When I dismiss Then report status updated and audit logged

- **US-055** As a **moderator**, I want to **resolve a report** so that **I can mark it as handled**.
  - Source: PRD §8.9, m7/003-moderation-actions-api, m10/008-moderation-admin-ui
  - Priority: Must-have
  - Acceptance: Given a report When I resolve Then report status updated and audit logged

- **US-056** As a **moderator**, I want to **suspend a user** so that **I can remove harmful actors from the platform**.
  - Source: PRD §8.9, m7/003-moderation-actions-api, m7/004-suspension-login-messaging-block
  - Priority: Must-have
  - Acceptance: Given a report When I suspend user Then suspended_until is set; user cannot login or message

- **US-057** As a **moderator**, I want to **delete a message** so that **I can remove inappropriate content**.
  - Source: PRD §8.9, m7/003-moderation-actions-api
  - Priority: Must-have
  - Acceptance: Given reported message When I delete_message Then message is soft-deleted

- **US-058** As a **moderator**, I want to **close a conversation** so that **I can stop harmful group exchanges**.
  - Source: PRD §8.9, m7/003-moderation-actions-api
  - Priority: Must-have
  - Acceptance: Given reported conversation When I close_conversation Then conversation is marked/archived

- **US-059** As a **moderator**, I want to **warn a user** so that **I can give notice before suspension**.
  - Source: PRD §8.9, m7/003-moderation-actions-api
  - Priority: Should-have
  - Acceptance: Given a report When I warn Then action is logged (notify user optional)

- **US-060** As a **moderator**, I want to **see message body only for reported conversations** so that **I respect content visibility rules**.
  - Source: PRD §7 (Moderation), m7/002-moderator-reports-queue
  - Priority: Must-have
  - Acceptance: Given unreported conversation When I view reports Then I see metadata only, not message body

---

### Platform Admin

- **US-061** As a **platform admin**, I want to **create and edit problem categories** so that **the taxonomy stays current**.
  - Source: PRD §8.4, m2/004-admin-taxonomy-crud
  - Priority: Must-have
  - Acceptance: Given admin role When I POST/PATCH problem-categories Then category is created/updated; member gets 403

- **US-062** As a **platform admin**, I want to **create and edit problem statements** so that **users can select relevant problems**.
  - Source: PRD §8.4, m2/004-admin-taxonomy-crud
  - Priority: Must-have
  - Acceptance: Given admin role When I POST/PATCH problem-statements Then statement is created/updated

- **US-063** As a **platform admin**, I want to **override district attribute values** so that **I can correct or supplement ingested data**.
  - Source: PRD §8.3, m3/003-admin-overrides-api
  - Priority: Must-have
  - Acceptance: Given admin role When I POST overrides for a district Then effective values update and display shows override

- **US-064** As a **platform admin**, I want to **view the audit log of moderation actions** so that **I can ensure compliance and review moderator activity**.
  - Source: PRD §8.9, m7/005-audit-logging
  - Priority: Must-have
  - Acceptance: Given admin role When I GET /moderation/audit-log Then I see actor, action, entity, metadata, timestamp

---

## By Milestone

| Milestone | User Stories |
|-----------|--------------|
| m1 | US-001, US-002, US-003, US-004, US-006a |
| m2 | US-007, US-008, US-009, US-010, US-011, US-012, US-013, US-061 |
| m3 | US-013 (provenance), US-063 |
| m4 | US-014, US-015, US-016, US-017, US-018, US-018a, US-019, US-020, US-021, US-022, US-023 |
| m5 | US-024, US-025, US-026, US-027, US-028, US-029, US-031 |
| m6 | US-030, US-033, US-034, US-035, US-036, US-037 |
| m7 | US-005, US-032, US-044, US-052, US-053, US-054, US-055, US-056, US-057, US-058, US-059, US-060, US-064 |
| m8 | US-038, US-039, US-040, US-041, US-042, US-043 |
| m9 | US-045, US-046, US-047, US-048 |
| m10 | US-006, US-049, US-050, US-051 (frontend for all above) |

---

## By PRD Section

| § | Section | User Stories |
|---|---------|--------------|
| 8.1 | Auth & Access | US-001, US-002, US-003, US-004, US-005, US-006, US-006a |
| 8.2 | User Profiles | US-007, US-008, US-009, US-010, US-011, US-012 |
| 8.3 | District Data | US-013, US-063 |
| 8.4 | Problem Taxonomy | US-010, US-061, US-062 |
| 8.5 | Discovery & Matching | US-014, US-015, US-016, US-017, US-018, US-018a, US-019 |
| 8.6 | Connections | US-019, US-020, US-021, US-022, US-023, US-029, US-036 |
| 8.7 | Messaging | US-024, US-025, US-026, US-027, US-028, US-030, US-031 |
| 8.8 | Groups | US-027, US-033, US-034, US-035, US-036, US-037 |
| 8.9 | Moderation | US-005, US-032, US-044, US-052–US-060, US-064 |
| 8.10 | Notifications | US-038, US-039, US-040, US-041, US-042, US-043 |
| 8.11 | AI Features | US-045, US-046, US-047, US-048 |

---

## Index (All Stories)

| ID | Role | Summary | Priority |
|----|------|---------|----------|
| US-001 | District staff | Register with email, password, full name | Must-have |
| US-002 | District staff | Log in with credentials | Must-have |
| US-003 | District staff | See current session and user info | Must-have |
| US-004 | District staff | Receive clear errors for invalid credentials | Must-have |
| US-005 | District staff | Be blocked from login when suspended | Must-have |
| US-006 | District staff | Redirect to login when session expires | Should-have |
| US-006a | District staff | Log out | Must-have |
| US-007 | District staff | View and edit profile | Must-have |
| US-008 | District staff | Select district from searchable list | Must-have |
| US-009 | District staff | Choose primary and secondary problems | Must-have |
| US-010 | District staff | Browse problem taxonomy by category | Must-have |
| US-011 | District staff | See prompt to complete profile when incomplete | Must-have |
| US-012 | District staff | Browse discovery before completing profile | Must-have |
| US-013 | District staff | View district details with provenance | Must-have |
| US-014 | District staff | Discover peers by filters | Must-have |
| US-015 | District staff | See match explanation | Must-have |
| US-016 | District staff | See exact vs close match labels | Must-have |
| US-017 | District staff | See connection status on each match | Must-have |
| US-018 | District staff | See close matches when exact scarce | Must-have |
| US-018a | District staff | View full profile of discovered peer | Must-have |
| US-019 | District staff | Send connection request | Must-have |
| US-020 | District staff | Accept connection request | Must-have |
| US-021 | District staff | Reject connection request | Must-have |
| US-022 | District staff | View connections in tabs | Must-have |
| US-023 | District staff | Prevent duplicate connection requests | Must-have |
| US-024 | District staff | Start 1:1 conversation | Must-have |
| US-025 | District staff | Send/receive messages in real time | Must-have |
| US-026 | District staff | View conversation history | Must-have |
| US-027 | District staff | Create group conversation (max 8) | Must-have |
| US-028 | District staff | Block messaging when profile incomplete | Must-have |
| US-029 | District staff | Block messaging when not connected | Must-have |
| US-030 | District staff | See shared problem banner in group | Should-have |
| US-031 | District staff | View inbox ordered by recency | Must-have |
| US-032 | District staff | Block messaging when suspended | Must-have |
| US-033 | District staff | Add connected peers to group | Must-have |
| US-034 | District staff | Leave group | Must-have |
| US-035 | District staff | View group participants | Must-have |
| US-036 | District staff | Prevent adding non-connected to group | Must-have |
| US-037 | District staff | Enforce 8-participant cap | Must-have |
| US-038 | District staff | Receive notification on new message | Must-have |
| US-039 | District staff | Receive notification on connection request | Must-have |
| US-040 | District staff | Receive notification on connection accepted | Must-have |
| US-041 | District staff | See unread count on bell | Must-have |
| US-042 | District staff | Mark notifications as read | Must-have |
| US-043 | District staff | Click notification to navigate | Should-have |
| US-044 | District staff | Report content | Must-have |
| US-045 | District staff | Request conversation summary | Should-have |
| US-046 | District staff | Request suggested next steps | Should-have |
| US-047 | District staff | View saved AI artifacts | Should-have |
| US-048 | District staff | See rate limit message for AI | Should-have |
| US-049 | District staff | See loading states | Should-have |
| US-050 | District staff | See clear error messages | Should-have |
| US-051 | District staff | Navigate with keyboard | Nice-to-have |
| US-052 | Moderator | View reports queue with filters | Must-have |
| US-053 | Moderator | See report metadata | Must-have |
| US-054 | Moderator | Dismiss report | Must-have |
| US-055 | Moderator | Resolve report | Must-have |
| US-056 | Moderator | Suspend user | Must-have |
| US-057 | Moderator | Delete message | Must-have |
| US-058 | Moderator | Close conversation | Must-have |
| US-059 | Moderator | Warn user | Should-have |
| US-060 | Moderator | See message body only for reported | Must-have |
| US-061 | Platform admin | Create/edit problem categories | Must-have |
| US-062 | Platform admin | Create/edit problem statements | Must-have |
| US-063 | Platform admin | Override district attributes | Must-have |
| US-064 | Platform admin | View audit log | Must-have |

---

## Potential Gaps

(No outstanding gaps; membership is approved on registration—no admin approval step in MVP.)
