# District Community Matching Platform — Implementation Plan

## Overview

Implementation plan for the District Community Matching Platform per [docs/prds/base.md](prds/base.md). The platform enables school district staff to discover peers facing similar challenges, connect via structured matching, and collaborate through real-time messaging and small-group conversations. District data is managed via an internal [Ingestion Console](prds/district-data-ingestion.md) (moderator-facing UI for ingest, preview, edit, audit).

## Current State Analysis

| Area | Status | Notes |
|------|--------|------|
| **PRD** | Complete | Full product requirements, MVP scope, NFRs |
| **Schema** | Complete | PostgreSQL DDL in `schema/01_extensions_enums.sql` through `schema/10_triggers.sql`; documented in `docs/db-schema.md` |
| **Research / decisions** | Complete | `developer-log.md` captures architecture and product decisions |
| **Application code** | None | No backend API, frontend, migrations runner, or infra |
| **docs/plans/** | New | This plan |

**Constraints discovered:**
- Schema is raw SQL (no migration runner); must run in order 01→10
- Schema expects `password_hash` (auth via credentials) with optional external IdP later
- Group max 8 participants enforced by DB trigger (`schema/10_triggers.sql`)
- Direct conversations use `conversation_direct_pairs` with `(user_low_id, user_high_id)` uniqueness
- Moderation content visibility is app-layer; schema does not implement RLS

---

## Technical Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| **Backend** | Node/TypeScript + Fastify | Plugin ecosystem (Postgres, websocket, JWT); @fastify/websocket integrates ws |
| **Frontend** | Next.js (App Router) | SSR/SSG, good DX; fits modular monolith + web frontend |
| **Migrations** | Raw SQL runner | Run `schema/*.sql` in order; schema already exists |
| **Auth** | Password (bcrypt) first; OAuth later | PRD: registration + login; schema supports nullable `password_hash` for IdP |
| **Websockets** | ws | Minimalist; @fastify/websocket provides integration; rooms/broadcast in app layer |
| **Background jobs** | pg-boss | Postgres-native; no Redis; ACID guarantees for ingestion/moderation |

See `developer-log.md` for decision rationale.

---

## Desired End State

**Specification:** Full MVP as defined in PRD §12 and §8, including:

1. Auth + profiles (district, role, bio, primary/secondary problems)
2. District data ingestion (moderator console: 100-district seed, preview, ingest, progress, errors, post-ingestion edit, audit) — per [district-data-ingestion PRD](prds/district-data-ingestion.md); map view for geographic coverage — per [district-data-visualization PRD](prds/district-data-visualization.md)
3. Problem taxonomy (admin-managed, categorized)
4. Discovery & matching (filter by problem, district, role, geography; ranked results; exact vs close match; match explanations)
5. Connections (send/accept requests; gate for messaging)
6. Real-time 1:1 and group messaging (websockets; connected users only)
7. Groups (create from connected users, max 8)
8. Moderation (report, review, suspend, audit logs)
9. Notifications (new messages, connection requests, status updates)
10. User-scoped AI (conversation summarization, suggested actions) — can be phased later

**Verification:**
- NFRs: match results < 2s; real-time messaging; encrypted in transit; RBAC enforced
- User flows: signup → complete profile → browse suggested peers → connect → message connected peers → create/join groups

---

## What We're NOT Doing

- Public social feed
- ML-based recommendation engine
- Broad dataset ingestion
- Vendor participation
- Fully automated moderation
- Microservices or dedicated search infra (per developer log)
- IdP-only auth in MVP
- RLS in initial schema

---

## Phase 1: Foundation — Project Setup, DB, Auth

### Overview

Bootstrap the monolith: project structure, database migrations, connection pool, and authentication (registration, login, sessions). No domain logic beyond identity.

### Changes Required

| Area | Changes |
|------|---------|
| **Root** | `package.json`, `tsconfig.json`, `.env.example`, `Makefile` or `package.json` scripts |
| **Migrations** | Script to run `schema/*.sql` in order against Postgres; idempotent where safe |
| **DB** | Connection module (e.g. `pg` or `drizzle`); health check |
| **Auth** | Registration (email + password), login, session (JWT or cookie); bcrypt for `password_hash` |
| **API** | Minimal routes: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`; middleware for protected routes |
| **Validation** | Zod schemas for auth inputs |

### Success Criteria

#### Automated Verification
- [x] `npm run build` succeeds
- [x] `npm run lint` passes
- [x] Migration script runs without error on fresh DB
- [x] `POST /auth/register` + `POST /auth/login` → valid session; `GET /auth/me` returns user (no password_hash)
- [x] Unauthenticated access to protected route returns 401

#### Manual Verification
- [x] User can register and log in via API
- [x] Session persists and validates correctly
- [x] Invalid credentials return 4xx

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 2: User Profiles, Districts, Taxonomy

### Overview

Implement profile CRUD, district lookup, and problem taxonomy. Enables profile completion (district + primary problem) for soft gating. No discovery or messaging yet.

### Changes Required

| Area | Changes |
|------|---------|
| **Users** | `GET/PATCH /users/me` (profile); enforce `profile_completed_at` when district + primary problem set |
| **Districts** | `GET /districts` (list with filters); `GET /districts/:id`; read from `districts` + `district_effective_attribute_values` |
| **Taxonomy** | `GET /problem-categories`, `GET /problem-statements` (by category, status=active); read-only for members |
| **Admin** | `POST/PATCH` taxonomy (category, problem) for `platform_role = admin`; RBAC checks |
| **Validation** | Zod schemas for profile, district filters, taxonomy |

### Success Criteria

#### Automated Verification
- [x] `make test` / `npm test` passes
- [x] `make lint` passes
- [x] Profile update with district + primary problem sets `profile_completed_at`
- [x] District and taxonomy endpoints return expected shapes

#### Manual Verification
- [x] User can complete profile (district, role, bio, primary + secondary problems)
- [x] Districts display with attributes and source/timestamp
- [x] Admin can manage problem categories and statements
- [x] Soft gate: messaging blocked until profile completed (stub 403 response)

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 3: District Data Ingestion & Admin Overrides

### Overview

Implement the full [district-data-ingestion PRD](prds/district-data-ingestion.md): moderator-facing Ingestion Console with 100 real district candidates, preview-before-ingest, UI-triggered ingestion (single and batch), progress tracking, error capture, missing data flagging, post-ingestion editing, and audit logging. Backend: attribute definitions, ingestion jobs, admin overrides, provenance display. Implemented via milestones m11–m15.

### Changes Required

| Area | Changes |
|------|---------|
| **District candidates** | Seed 100 real districts (NCES-backed); `district_candidates` table; status per candidate (not_ingested, ingested, failed, etc.) |
| **Attribute definitions** | Seed `district_attribute_definitions` (type, enrollment, FRL, EL, grade bands); per db-schema.md MVP set |
| **Ingestion** | Job model: parse source → normalize → insert `district_ingestion_events`; merge into `district_effective_attribute_values`; async (pg-boss) for batch |
| **Ingestion Console API** | Dashboard summary; candidate list (filters: state, status, search); preview; trigger ingest; job progress; retry failed |
| **Admin overrides** | `PATCH /admin/ingestion/districts/:id`; insert/update `district_admin_overrides`; recompute effective values; revert to source |
| **Errors & data quality** | Capture ingestion errors (type, message, retry_eligible); missing data flags; display in UI |
| **Moderator UI** | Dashboard (summary cards, candidate table, filters); district preview screen; ingest trigger; job progress view; district edit screen |
| **Audit** | Log: preview viewed, ingestion started/completed, district edited, override reverted |
| **Display** | District endpoints surface `provenance`, `last_ingestion_event_id`, `last_override_id` |
| **Demo/seed** | Optional seed script for demo districts and users (`is_demo = true`) |

### Success Criteria

#### Automated Verification
- [x] Ingestion job runs and populates `district_ingestion_events` and `district_effective_attribute_values`
- [x] Admin override updates effective values correctly
- [x] Source/timestamp visible in district API responses
- [x] Moderator can trigger ingestion from API; job progresses; errors captured
- [x] 100 district candidates seeded with NCES mappings

#### Manual Verification
- [x] Moderator sees ingestion dashboard with candidate list, filters, summary
- [x] Moderator can preview district before ingest, trigger ingest, view progress
- [x] Districts show ingested attributes with provenance
- [x] Moderator can edit ingested district; override visible; revert to source works
- [x] Errors and missing data surfaced; retry available for eligible failures
- [x] Audit trail queryable for ingestion actions
- [x] Demo data available for cold-start testing

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 4: Discovery, Matching & Connections

### Overview

Implement discovery API (suggested connections) and LinkedIn-style connections: filter by problem, district attributes, role, geography; rank results; label exact vs close match; user can send connection requests to any discovered peer; accept/reject flow. No messaging yet—discovery and connection establishment only.

### Changes Required

| Area | Changes |
|------|---------|
| **Schema** | Add `user_connections` table (user_a_id, user_b_id, status: pending \| accepted, requested_by_user_id, created_at, resolved_at); unique on (user_a_id, user_b_id) with user_a < user_b |
| **Matching** | `GET /discovery/matches` with query params: `problemId`, `districtFilters`, `professionalRole`, `stateRegion`, etc.; returns suggested peers to connect with |
| **Filtering** | DB-level filters (problem, district attributes, geography); exclude suspended, non-approved |
| **Ranking** | App-layer heuristic: primary problem match > secondary > district similarity; deterministic, explainable |
| **Response** | List of users with `matchType` (exact \| close), `explanation`, `connectionStatus` (none \| pending_sent \| pending_received \| connected) |
| **Connections** | `POST /connections/requests` (target user_id); `POST /connections/requests/:id/accept`, `POST /connections/requests/:id/reject`; `GET /connections` (list connected, pending sent, pending received) |
| **Cold start** | When exact matches scarce, broaden criteria; include `is_demo_profile` when configured; label clearly |
| **Performance** | Index `user_problem_selections(problem_statement_id)`, `user_connections(user_a_id, user_b_id)`; target < 2s per request |

### Success Criteria

#### Automated Verification
- [x] Matching returns only approved, non-suspended users with profile completed
- [x] Filters reduce result set as expected
- [x] Match explanations and connectionStatus present and coherent
- [x] Connection request creates pending row; accept/reject updates status
- [x] Cannot send duplicate connection request; cannot connect with self
- [x] Query latency < 2s under test load

#### Manual Verification
- [x] User can discover peers by problem and district filters
- [x] User can send connection request; recipient sees pending; accept creates connection
- [x] Exact vs close matches labeled correctly
- [x] Cold-start behavior shows close matches when exact are limited

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 5: Conversations & Real-Time Messaging

### Overview

Enable 1:1 and group conversations. Enforce: messaging only between connected users; profile completion required. Real-time delivery via websockets.

### Changes Required

| Area | Changes |
|------|---------|
| **Conversations** | `POST /conversations` (direct or group); resolve/create `conversation_direct_pairs` for 1:1 |
| **Messaging gate** | Before create/message: requester has `profile_completed_at`; users are connected (accepted connection) |
| **Messages** | `POST /conversations/:id/messages`; `GET /conversations/:id/messages` (paginated) |
| **Websockets** | Connect with auth; subscribe to conversation channels; broadcast new messages to participants |
| **Inbox** | `GET /conversations` (user's active conversations, ordered by `updated_at`) |
| **Group creation** | Participants must be connected; enforce max 8 (DB trigger + app check) |
| **Validation** | Zod for message body, participant list; enforce policy in service layer |

### Success Criteria

#### Automated Verification
- [x] `make test` passes
- [x] Messaging blocked when profile incomplete or users not connected
- [x] Direct conversation idempotent for same user pair
- [x] Group creation fails when > 8 participants or non-connected user included
- [x] Websocket delivers new message to participants

#### Manual Verification
- [x] User can start 1:1 and group conversations with connected peers
- [x] Messages appear in real time
- [x] Conversation history loads correctly
- [x] Soft-deleted messages hidden from UI

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 6: Groups & Participant Management

### Overview

Extend conversation UX: join/leave groups, list participants, manage membership. Ensure group creation from connected users only and max 8 enforced in app and DB.

### Changes Required

| Area | Changes |
|------|---------|
| **Participants** | `GET /conversations/:id/participants`; `POST /conversations/:id/participants` (invite); `DELETE` (leave) |
| **Invites** | Invite only connected users; enforce 8-participant cap before insert |
| **Group metadata** | Optional `shared_problem_statement_id` for contextual prompts in compose UX |
| **Leave** | Set `left_at`; do not delete; preserve history |

### Success Criteria

#### Automated Verification
- [x] Cannot add non-connected user to group
- [x] Cannot exceed 8 active participants (app + DB trigger)
- [x] Leave sets `left_at`; user no longer receives messages

#### Manual Verification
- [x] User can add connected peers to group
- [x] User can leave group; history preserved
- [x] Contextual prompts (shared problem) available in compose

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 7: Moderation — Reports, Review, Suspension

### Overview

Implement reporting and moderator workflows: report user/message/conversation; review; dismiss, resolve, warn, suspend. Audit logging for actions.

### Changes Required

| Area | Changes |
|------|---------|
| **Reports** | `POST /reports` (target_type + target IDs, reason_code, details); auth required |
| **Moderator** | `GET /reports` (filter by status); `POST /moderation/actions` (dismiss, resolve, warn, suspend, delete message, close conversation) |
| **Suspension** | Set `users.suspended_until`; block login and messaging for suspended users |
| **Audit** | Insert `audit_log_entries` for moderation actions; include actor, action, entity, metadata |
| **Content visibility** | Moderator reads `messages.body` only for reported conversations (API enforcement) |

### Success Criteria

#### Automated Verification
- [x] Report creates row in `reports` with correct target_type/target_id
- [x] Moderation action updates report, user, or message as expected
- [x] Suspended user cannot log in or send messages
- [x] Audit log entries created for each action

#### Manual Verification
- [x] User can report content
- [x] Moderator can review and take action
- [x] Suspended user sees appropriate messaging
- [x] Audit trail queryable for compliance

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 8: Notifications

### Overview

Notify users of new messages and status updates (e.g. membership approved). Store in `notifications`; deliver via websocket or polling; mark read.

### Changes Required

| Area | Changes |
|------|---------|
| **Create** | On new message: create notification for other participants (type `new_message`) |
| **Create** | On connection request: create notification for target (type `connection_request`) |
| **Create** | On connection accepted: create notification for requester (type `connection_accepted`) |
| **Create** | On membership_status change: create notification (type `membership_status`) |
| **API** | `GET /notifications` (paginated, filter unread); `PATCH /notifications/:id/read` |
| **Delivery** | Push via websocket when connected; else poll or next fetch |
| **Background** | Optional job to batch-create notifications for offline users |

### Success Criteria

#### Automated Verification
- [x] New message creates notification for recipients
- [x] Membership status change creates notification
- [x] Mark read updates `read_at`
- [x] Unread count accurate

#### Manual Verification
- [x] User receives notification when message arrives
- [x] User sees unread count and can mark read
- [x] Notifications appear in real time when connected

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 9: AI Features (User-Scoped)

### Overview

User-scoped AI: conversation summarization and suggested next steps. Only operates on conversations the user participates in. Store artifacts in `user_ai_artifacts`.

### Changes Required

| Area | Changes |
|------|---------|
| **Summarization** | `POST /conversations/:id/summarize`; call LLM with user-visible messages only; store in `user_ai_artifacts` |
| **Suggested actions** | `POST /conversations/:id/suggest-actions`; store in `user_ai_artifacts` |
| **Retrieval** | `GET /conversations/:id/ai-artifacts` (user-scoped; verify participation) |
| **LLM** | Integrate provider (e.g. OpenAI, Anthropic); prompt versioning in artifact metadata |
| **Rate limiting** | Protect AI endpoints from abuse |
| **Scope** | Enforce: requester must be participant; no global scanning |

### Success Criteria

#### Automated Verification
- [x] AI endpoints enforce participation check
- [x] Artifacts stored with correct `user_id`, `conversation_id`, `kind`
- [x] Non-participant receives 403

#### Manual Verification
- [x] User can request summary of their conversation
- [x] User receives suggested next steps
- [x] Artifacts persist and display correctly

**Note:** Pause for human confirmation after this phase before proceeding.

---

## Phase 10: Frontend & Polish

### Overview

Web frontend for all MVP flows: auth, profile, discovery, messaging, groups, notifications, moderation (admin). Responsive, accessible, aligned with NFRs (fast onboarding, clear match explanations).

### Changes Required

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
| **Ingestion Console** | Moderator: dashboard, candidate list, preview, ingest, progress, district edit (per district-data-ingestion PRD); map view with markers (per district-data-visualization PRD) |
| **Polish** | Loading states, error handling, accessibility, performance |

### Success Criteria

#### Automated Verification
- [x] `npm run build` succeeds
- [ ] E2E or integration tests for critical paths (optional)
- [ ] Lighthouse/accessibility checks pass (if configured)

#### Manual Verification
- [x] End-to-end user journey: signup → profile → discover → connect → message → group
- [x] Match explanations clear and useful
- [x] Real-time messaging feels responsive
- [x] Moderation workflow usable by moderator
- [x] Ingestion console usable by moderator (dashboard, preview, ingest, edit, audit)
- [ ] Map view usable by moderator (markers, filters, click-through to preview)

---

## Phase 11: District Data Visualization (Map View)

Add an interactive map view to the ingestion console per [district-data-visualization PRD](prds/district-data-visualization.md). Moderators see district candidates as point markers (color-coded by ingestion status), filter by status/state/search, and click through to district preview. Extends the existing ingestion console.

**End state:** Map with "Table" \| "Map" tab; markers colored by status; filters update markers; click → candidate preview. Districts without coordinates excluded; count shown. Geocoding via `npm run geocode:district-candidates`. A simple map with working markers beats a complex map with broken geocoding.

**Out of scope:** District boundary polygons; geocoding at ingestion time; real-time geocoding; clustering; public or mobile map UX.

**Technical decisions:** Nominatim (geocoding); Leaflet + react-leaflet (map); `GET /admin/ingestion/map-data` (dedicated endpoint); tab "Table" \| "Map" integration.

---

### Phase 11.1: Schema & Geocoding Enrichment

Add latitude, longitude, geocoded_at to district_candidates. Implement and run geocoding script using Nominatim.

| Area | Changes |
|------|---------|
| **Schema** | New `schema/12_district_candidates_geocode.sql`: `ALTER TABLE district_candidates ADD COLUMN latitude numeric(9,6)`, `longitude numeric(9,6)`, `geocoded_at timestamptz` |
| **Geocoding script** | `backend/scripts/geocode-district-candidates.ts`: fetch candidates with `latitude IS NULL`; for each, call Nominatim `{name}, {state}, USA`; 1 req/sec delay; update row; log success/failure |
| **Package.json** | Add `"geocode:district-candidates"` script |
| **Nominatim** | Use `https://nominatim.openstreetmap.org/search?q=...&format=json`; set User-Agent header per OSM policy |

**Success:** Migration runs; script processes candidates; rows updated with lat/lng where geocode succeeds. Run 10 districts first, then full 100. Script idempotent.

---

### Phase 11.2: Map Data API

Expose endpoint to return district candidates with coordinates for map rendering.

| Area | Changes |
|------|---------|
| **API** | `GET /admin/ingestion/map-data` — params: `search`, `state`, `status`; returns `{ districts: [{ id, name, state, status, latitude, longitude }] }`; exclude rows with NULL lat/lng; no pagination; limit 500 |
| **Auth** | Same middleware as ingestion: `authenticate`, `requireModerator` |
| **Validation** | Zod schema for query params |
| **Routes** | Add in `backend/src/routes/ingestion.ts` |

**Success:** Returns 200 with districts array; filters reduce result set; 401/403 for unauthenticated; < 500ms for 100 districts.

---

### Phase 11.3: Map Component & Integration

Add Leaflet + react-leaflet; create map component; integrate as "Table" \| "Map" tab.

| Area | Changes |
|------|---------|
| **Frontend deps** | `leaflet`, `react-leaflet`, `@types/leaflet` |
| **Map component** | `frontend/src/components/IngestionMap.tsx` — client component; fetch map-data; MapContainer, TileLayer (OSM), Markers; color by status (green/orange/gray/blue/yellow/red); popup → link to `/admin/ingestion/candidates/[id]` |
| **Ingestion page** | Add "Table" \| "Map" tabs; reuse filter bar state for map |
| **Styling** | Map min-height 400px; legend; "X districts missing coordinates" when any excluded |

**Success:** `npm run build` succeeds; map displays markers; zoom/pan; click → preview; filters update markers; loads in < 3s.

---

### Phase 11.4: Polish & Edge Cases

Legend, loading states, error handling, empty state, documentation.

| Area | Changes |
|------|---------|
| **Legend** | Status → color mapping visible |
| **Empty state** | "No districts with coordinates" or "Run geocoding script" when all missing |
| **Error handling** | API failure shows message; retry or link to docs |
| **Docs** | How to run geocoding script; when to re-run |

**Success:** Legend matches dashboard badge colors; empty/error states handled; geocoding script documented.

---

## Dependencies Between Phases

```
Phase 1 (Foundation)
    ↓
Phase 2 (Profiles, Districts, Taxonomy)
    ↓
Phase 3 (Ingestion) — m11–m15: Ingestion Console (100 districts, dashboard, preview, ingest, errors, edit, audit)
    ↓
Phase 11 (Map View) — 11.1 Schema & geocoding → 11.2 Map API → 11.3 Map component → 11.4 Polish; depends on Phase 3
    ↓
Phase 4 (Discovery/Matching/Connections)
    ↓
Phase 5 (Conversations/Messaging) ←→ Phase 6 (Groups) — can overlap
    ↓
Phase 7 (Moderation)
    ↓
Phase 8 (Notifications)
    ↓
Phase 9 (AI) — can parallel with 8
    ↓
Phase 10 (Frontend) — can start after Phase 2, iterate each phase
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Match performance > 2s | Index tuning; consider materialized view or cached match set for heavy users |
| Websocket scale | Start with single-instance; sticky sessions or Redis adapter for horizontal scale later |
| Poor data quality | Start with small, high-confidence attribute set; validate ingestion output |
| Cold start empty results | Progressive broadening; seeded demo profiles; clear "close match" labeling |
| Moderation content access | Enforce in API; no RLS initially; document policy clearly |
| Geocoding accuracy/rate limits | Nominatim may misgeocode some districts; rate limit ~1 req/sec; use static lookup for critical misses if needed |

---

## References

- PRD: `docs/prds/base.md`
- District Data Ingestion PRD: `docs/prds/district-data-ingestion.md` — full spec for Ingestion Console (dashboard, preview, ingest, errors, edit, audit)
- District Data Visualization PRD: `docs/prds/district-data-visualization.md` — map view with markers
- Schema: `docs/db-schema.md`, `schema/*.sql`
- Milestones: `docs/milestones/_index.md` — m11–m15 implement Phase 3 (Ingestion Console)
- Research / decisions: `developer-log.md`
- Plan prompt: `agent/prompts/plan.md`
- Implement prompt: `agent/prompts/implement.md`
