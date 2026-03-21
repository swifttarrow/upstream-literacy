# Developer Log

Major product and technical decisions are captured here to preserve implementation context.

## Research

The entries below capture the current research-phase decisions and product direction.

### [2026-03-20] District similarity for discovery, people-to-people messaging

**Context:** Matching needed to support both relevant discovery and natural user communication in district-based networking.
**Options considered:** (A) District-only matching and district-only interactions vs (B) district-based discovery with people-to-people messaging.
**Decision:** Choose district-to-district similarity for discovery, while messaging occurs directly between people.
**Rationale:** District similarity provides strong relevance signals for who should discover whom, but conversation intent and relationship-building happen person-to-person.
**Impact:** Discovery and ranking logic should prioritize district similarity; messaging UX, permissions, and language should center on individual users.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Matching via filters plus explainable ranking heuristics

**Context:** Matching needed a practical method that enforces baseline relevance while still ordering candidates by quality in a transparent way.
**Options considered:** (A) Pure hard-filter matching only vs (B) hard filters followed by heuristic ranking with user-facing explanation.
**Decision:** Use a combination of filters and ranking heuristics, with explanation of why a match is shown.
**Rationale:** Filters remove clearly unqualified matches upfront, while heuristic ranking improves quality among valid candidates; explanations increase user trust and debuggability.
**Impact:** Matching pipeline should apply deterministic filter gates first, then score/rank remaining candidates; product surfaces should include concise "why this match" reasons.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Messaging limited to matches and approved requests

**Context:** Messaging policy needed to balance meaningful connection-making with protection against inbox overload and low-signal outreach.
**Options considered:** (A) Completely open messaging for all users vs (B) messaging only between matched users and users with approved message requests.
**Decision:** Only matched users and approved message requests can enable two-way messaging between people.
**Rationale:** Restricting who can message back-and-forth reduces overwhelming noise, improves conversation quality, and keeps outreach intentional.
**Impact:** Access control for messaging should enforce match/approval prerequisites before enabling replies; open unsolicited messaging remains intentionally disabled.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Problem statements use fully pre-defined options

**Context:** We needed to decide whether users should define their problem statements through fixed structured options or open-ended input.
**Options considered:** (A) Fully predefined categories/templates with no optional text vs (B) free-text problem statements.
**Decision:** Problem statements must be fully pre-defined, with no optional text.
**Rationale:** Fully structured input makes moderation easier, improves searchability, and increases consistency across submitted statements.
**Impact:** Product and data models should enforce selection from predefined statements only; matching, moderation, and search can rely on normalized categories.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Moderation model defined in three levels

**Context:** We needed a clear operational definition of moderation scope so responsibilities can be assigned consistently as the community grows.
**Options considered:** (A) Single undifferentiated moderation function vs (B) multi-level moderation with distinct responsibilities.
**Decision:** Define moderation as three levels: membership moderation, content moderation, and community facilitation.
**Rationale:** Splitting moderation into levels clarifies ownership, reduces gaps in coverage, and ensures both safety and community quality are actively managed.
**Impact:** Moderation workflows and permissions should map to: (1) membership moderation for approving/verifying users, (2) content moderation for reviewing reports and suspending accounts, and (3) community facilitation for curating topics, introducing peers, and managing quality.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Community taxonomy stays broad and system-defined

**Context:** We needed a community structure that supports active participation without creating fragmented, low-signal spaces.
**Options considered:** (A) Pre-create communities for attribute combinations (type x role x problem and similar) vs (B) maintain a small finite set of broad communities defined by core attributes.
**Decision:** Communities are broad, high-density, system-defined containers (about 5-10 total), primarily defined by district type and role.
**Rationale:** A controlled top-level taxonomy preserves discussion density, simplifies moderation, and avoids rigid combinatorial structures that age poorly.
**Impact:** Community objects should remain canonical and finite; secondary attributes (problem area, demographics, district size when secondary) should be modeled as filters/segments, not as new communities.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Matching precision lives outside community creation

**Context:** We needed to decide where relevance precision should live: in proliferating community objects or in recommendation and discovery systems.
**Options considered:** (A) Encode precision by creating more narrowly scoped communities vs (B) keep communities broad and apply precision through filtering/ranking and top-match discovery.
**Decision:** Community is the broad shared space; precision is delivered through filters, matching heuristics, recommendation ranking, and "Top matches" surfaces.
**Rationale:** Separating broad community membership from precision discovery improves flexibility and avoids structural churn each time segmentation needs evolve.
**Impact:** Product surfaces should emphasize filtering and match recommendations within communities; internal modeling can use fixed containers and/or dynamic segmented views without introducing new permanent community types.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Onboarding and governance prevent community proliferation

**Context:** We needed an entry flow and governance model that gives users flexibility while protecting network quality from uncontrolled group sprawl.
**Options considered:** (A) Fully user-driven community creation and manual joining vs (B) system-guided onboarding with controlled taxonomy and lightweight alternatives for niche needs.
**Decision:** Use hybrid onboarding (auto-assign users to 2-4 relevant communities, then allow confirm/leave/join adjustments), disallow permanent user-generated and nested sub-communities, and support niche needs through threads, filters/matching, and optional time-bound cohorts.
**Rationale:** System defaults create strong initial placement, user adjustment preserves agency, and anti-proliferation controls prevent low-activity fragmentation and moderation overhead.
**Impact:** Implement controlled membership governance, thread-level topic organization, and optional temporary cohorts (small, time-bound, moderator/system-created) instead of creating new permanent community objects.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] User base restricted to district staff only

**Context:** We needed to define who is in-scope for membership so community trust, relevance, and moderation rules are clear from the start.
**Options considered:** (A) Mixed membership including vendors/consultants/company representatives vs (B) school district staff only.
**Decision:** Assume users are school district staff only; no vendors, consultants, or company representatives.
**Rationale:** Restricting membership to district staff preserves peer relevance, reduces commercial noise, and simplifies trust and moderation policy.
**Impact:** Onboarding and verification should enforce district-staff eligibility; access policies and moderation guidelines should explicitly exclude non-district external roles.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Members can belong to multiple problem areas

**Context:** We needed to decide whether problem-area membership should force a single primary category or allow multi-membership across concurrent needs.
**Options considered:** (A) Single problem-area assignment per member vs (B) multiple problem-area memberships per member.
**Decision:** Members can belong to multiple problem areas at once.
**Rationale:** District staff often work across overlapping priorities, so multi-membership better reflects real workflows and improves relevant discovery.
**Impact:** Data model and matching logic should support many-to-many member-to-problem-area relationships, with filtering and ranking aware of multiple active affinities.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Group conversations supported alongside 1-on-1 messaging

**Context:** We needed to define conversation modes to support both direct peer exchanges and collaborative discussions across small sets of members.
**Options considered:** (A) 1-on-1 messaging only vs (B) support both 1-on-1 and group conversations.
**Decision:** Support group conversations in addition to 1-on-1 messaging.
**Rationale:** Group threads enable richer collaboration around shared problems while preserving direct messaging for focused person-to-person exchanges.
**Impact:** Messaging architecture, permissions, and UX should support participant-managed multi-user threads, while retaining existing controls for direct conversations.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Company moderation posture remains neutral and passive

**Context:** We needed to define how visible and interventionist company moderation should be during member conversations.
**Options considered:** (A) Active/high-touch company moderation in discussions vs (B) neutral/passive moderation that intervenes only when needed.
**Decision:** Company moderation should be neutral and passive, without detracting from member conversations.
**Rationale:** A low-profile moderation posture preserves authentic peer dialogue and trust while still allowing safety enforcement when necessary.
**Impact:** Moderation playbooks should prioritize minimal interruption, clear escalation thresholds, and targeted interventions rather than frequent in-thread company presence.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] MVP uses one unified network directory

**Context:** We needed to choose an MVP network structure that maximizes early connection density while minimizing onboarding complexity.
**Options considered:** (A) One unified network where all users are in a single directory with filters vs (B) multiple segmented community directories from day one.
**Decision:** For MVP, use one unified network directory where all users are discoverable in a single network.
**Rationale:** A unified network maximizes network effects, keeps the data model simpler, reduces onboarding friction ("which community do I join?"), and avoids early fragmentation; the tradeoff is potential noise that must be handled through strong filtering and matching UX.
**Impact:** Discovery should support filtering by district attributes, problem statements, role, and geography (for example: "show suburban districts, 5k-15k students, working on literacy interventions"); product and ranking design should prioritize relevance controls to prevent broad/noisy results.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] MVP starts with a small, high-confidence district dataset

**Context:** We needed to define the initial district data scope for matching and filtering without overfitting the model to noisy or hard-to-maintain fields.
**Options considered:** (A) Ingest broad/complete district data from the start vs (B) launch with a small set of high-confidence, high-signal attributes.
**Decision:** Start with a small, high-confidence dataset rather than trying to include everything at MVP.
**Rationale:** A constrained attribute set improves data quality, simplifies implementation, and makes matching behavior easier to validate and explain early.
**Impact:** MVP data model should include: district type (urban/suburban/rural), enrollment size in buckets (for example: <2k, 2k-10k, 10k-50k, 50k+), state/region, % free/reduced lunch in buckets, % English learners in buckets, and grade bands (for example: K-5, 6-8, 9-12); avoid relying on exact values where bucketed ranges are sufficient.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Messaging allows direct outreach with shared context

**Context:** We needed a messaging model that enables fast peer connection while keeping outreach relevant and reducing low-context cold starts.
**Options considered:** (A) Require approval gates before any direct messaging vs (B) allow direct messaging between matched peers with contextual scaffolding.
**Decision:** Users can directly message matched peers without separate approval, and each message flow includes pre-filled shared context (for example, a common problem area).
**Rationale:** Removing extra approval friction increases connection velocity, while contextual prompts preserve relevance and reduce random cold outreach.
**Impact:** Messaging UX should include contextual metadata in compose/send flows; policy should keep direct messaging tied to matched-peer relationships.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Cold start uses expanded criteria and optional seed profiles

**Context:** We needed a fallback approach for early-stage or sparse-network moments when exact matches may be limited.
**Options considered:** (A) Show no or very few results when strict criteria fail vs (B) progressively broaden criteria and optionally surface seeded/demo profiles.
**Decision:** If exact matches are limited, the system broadens matching criteria to show close matches and may include seeded/demo profiles to preserve a useful first experience.
**Rationale:** Progressive broadening prevents empty states, and seed data helps guarantee meaningful discovery for early users during network ramp-up.
**Impact:** Matching should support tiered recall expansion with clear labeling of close matches; seed/demo profiles must be clearly governed and identifiable in operational policy.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Profile completion gating is soft, not hard

**Context:** We needed to balance low-friction onboarding with minimum profile quality required for high-value interactions.
**Options considered:** (A) Hard gate all exploration until full profile completion vs (B) allow browsing immediately and gate key actions until essential fields are complete.
**Decision:** Use soft gating: users can browse after signup, but actions like messaging are restricted until required profile fields (district plus primary problem) are completed.
**Rationale:** Soft gating improves early engagement and reduces drop-off, while still ensuring enough profile data for relevant, trustworthy interactions.
**Impact:** Access control should enforce action-level prerequisites; onboarding UX should prominently guide users to complete required fields before interaction unlock.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Group conversations can be user-created

**Context:** We needed to define whether small-group collaboration should require moderator setup or be user-driven.
**Options considered:** (A) Moderator/system-created groups only vs (B) user-created small-group conversations around shared needs.
**Decision:** Users can create small-group conversations directly, typically around shared problems or interests, without requiring moderator setup.
**Rationale:** User-created groups increase collaboration speed, support emergent coordination patterns, and reduce operational bottlenecks.
**Impact:** Messaging and permissions should support user-initiated group thread creation, membership controls, and moderation safeguards appropriate for group contexts.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Product direction is community-first with matching foundation

**Context:** We needed to clarify the primary product posture between utility-first matching alone and ongoing community engagement.  
**Options considered:** (A) Match-first transactional experience only vs (B) community-first experience powered by structured matching.  
**Decision:** Prioritize a community-driven experience focused on interaction, conversation, and ongoing engagement, while keeping structured matching as the foundation.  
**Rationale:** Community-first dynamics increase retention and collective value over time, and matching remains the mechanism that anchors relevance and quality.  
**Impact:** Roadmap and UX should emphasize conversational surfaces, repeat engagement loops, and community activity signals in addition to core matching performance.  
**Owner:** Agent (Codex) + developer confirmation pending

## Research - Architecture

The entries below capture architecture and operating-model decisions for MVP.

### [2026-03-20] Audience scope remains district-staff only

**Context:** MVP needed a clear membership boundary to keep trust high and moderation manageable.
**Options considered:** (A) Include vendors/consultants/company reps in-network vs (B) restrict to school district staff only.
**Decision:** Initial audience is school district staff only.
**Rationale:** A focused peer audience improves signal quality, reduces commercial noise, and simplifies moderation policy in early phases.
**Impact:** Identity and access rules should enforce district-staff eligibility and explicitly block non-district external roles.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Unified network with community layer on top

**Context:** We needed to choose a core network topology that maximizes early discovery while avoiding brittle structural partitions.
**Options considered:** (A) Hard-partitioned communities as primary containers vs (B) one unified directory with community experience layered through conversation surfaces.
**Decision:** Use a single unified network for discovery/matching; implement community experience through messaging and group interactions rather than hard partitions.
**Rationale:** Unified topology maximizes match opportunities and reduces fragmentation while still enabling community feel through interaction design.
**Impact:** Discovery should query one shared member graph; community UX should be delivered by conversation/group mechanics instead of strict membership silos.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Problem-first matching with primary and secondary signals

**Context:** Matching needed an explicit relevance hierarchy for predictable results and explainability.
**Options considered:** (A) District-demographic-first matching vs (B) shared-problem-first matching with district attributes as refinement.
**Decision:** Matching prioritizes shared problem statements as the primary signal; users choose one primary problem plus optional secondary tags; district attributes refine ranking.
**Rationale:** Problem-first logic maximizes actionable peer connections while still preserving contextual fit through district similarity.
**Impact:** Matching logic should weight primary problem highest, include secondary tags and district signals, return exact vs close matches, and generate explanations from scoring inputs (for example: "same problem + similar district size").
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] District data model uses normalized, source-labeled snapshots

**Context:** MVP data ingestion required trustworthy public attributes without overfitting to noisy or overly precise values.
**Options considered:** (A) Broad raw ingestion with exact values and overwrite updates vs (B) curated high-confidence attributes with normalization and snapshot versioning.
**Decision:** Use a small, high-confidence attribute set with bucketed values; store public data separately from user-provided data; source-label and timestamp public records; version district updates via snapshots.
**Rationale:** Normalized and versioned data improves trust, auditability, and consistency while keeping early implementation practical.
**Impact:** District data pipelines must bucket fields (enrollment, FRL, EL, grade bands), preserve provenance/timestamps, separate public vs user-entered tables/fields, and keep historical snapshots instead of destructive overwrite.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Messaging model supports direct, contextual, real-time conversations

**Context:** Conversation UX needed to feel immediate and relevant while keeping early engagement friction low.
**Options considered:** (A) Approval-heavy or polling-based messaging vs (B) direct matched-peer messaging with context prompts and websocket real-time delivery.
**Decision:** Allow direct messaging between matched peers without extra approval friction; include contextual prompts in compose flow; implement true real-time messaging via websockets.
**Rationale:** Lower friction improves engagement, contextual scaffolding keeps outreach relevant, and real-time behavior matches community-product expectations.
**Impact:** Conversation services should support websocket delivery and future presence/typing signals; compose UX should surface shared context; direct message eligibility remains tied to matching policy.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Group formation is matched-user constrained

**Context:** Group collaboration needed to be user-driven without opening spammy or low-relevance group creation patterns.
**Options considered:** (A) Open group creation from any users vs (B) user-created groups restricted to matched users.
**Decision:** Support both 1:1 and group conversations; groups are user-created but only from matched users, with small-group cap of 8 participants.
**Rationale:** This preserves collaboration flexibility while reinforcing relevance and limiting abuse vectors.
**Impact:** Conversation model should unify DM/group entities with participant join tables; group-creation UI must enforce matched-user eligibility and max-size constraints.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Soft gating and cold-start fallbacks are first-class

**Context:** MVP needed to reduce onboarding drop-off while preventing low-context messaging and empty match states.
**Options considered:** (A) Hard pre-browse profile completion and strict exact-only matching vs (B) browse-first soft gating plus progressive close-match fallback and optional seed profiles.
**Decision:** Users can browse immediately, but messaging unlocks only after district plus primary problem are set; matching broadens to close matches when needed and may include seeded/demo profiles.
**Rationale:** This combination balances activation, quality, and perceived utility during early network density.
**Impact:** Access control should enforce action-level profile prerequisites; match ranking should support expansion tiers and clear labeling for close/seeded results.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] Moderation is neutral/reactive and AI remains user-scoped

**Context:** We needed a safety model that protects trust without creating heavy-handed platform visibility into all conversations.
**Options considered:** (A) Proactive global moderation and broad AI scanning vs (B) neutral/reactive moderation with report-driven deep access and user-scoped AI features.
**Decision:** Company moderation is neutral/passive and primarily reactive; moderators can view cross-conversation metadata but full content only for reported conversations; MVP AI operates only on conversations a user participates in.
**Rationale:** This approach enforces safety while minimizing unnecessary surveillance and preserving authentic peer interaction.
**Impact:** Moderation tooling should center on reporting, escalation, and audit logs; AI services must enforce strict conversation-level access controls with no global cross-network scanning in MVP.
**Owner:** Agent (Codex) + developer confirmation pending

### [2026-03-20] MVP architecture is modular monolith on relational database

**Context:** We needed an implementation architecture that optimizes for MVP speed while preserving clean boundaries for future scaling.
**Options considered:** (A) Early microservices plus dedicated search stack vs (B) modular monolith with relational DB, DB filtering, and app-layer scoring.
**Decision:** Build MVP as a modular monolith backed by a relational database (Postgres-class), use DB-driven filtering plus application-layer deterministic scoring, and defer dedicated search infra until scale warrants it.
**Rationale:** This maximizes delivery speed and consistency for relationship-heavy data while avoiding premature distributed complexity.
**Impact:** System domains should be explicitly separated (Identity and Access, District Data, Problem Taxonomy, Discovery and Matching, Conversations, Moderation and Admin, Notifications); async jobs should handle ingestion/normalization/notifications/future analytics; deferred items include ML matching, global AI insights, microservices decomposition, and advanced search infrastructure.
**Owner:** Agent (Codex) + developer confirmation pending

## Planning

### [2026-03-20] Implementation plan created for District Community Matching Platform

**Context:** PRD and schema were complete; no implementation plan existed for building the application.
**Options considered:** (A) Single monolithic phase vs (B) phased approach aligned with PRD domains and dependencies vs (C) domain-driven parallel tracks.
**Decision:** Phased implementation in 10 phases: Foundation → Profiles/Districts/Taxonomy → Ingestion → Discovery → Messaging → Groups → Moderation → Notifications → AI → Frontend.
**Rationale:** Sequential phases respect dependencies (auth before profiles, matching before messaging); each phase has clear success criteria and human verification checkpoints per agent/prompts/plan.md.
**Impact:** Implementation should follow `docs/plans/2026-03-20-district-community-matching-platform.md`; technical stack (Node/TS, Next.js, etc.) proposed as defaults—confirmation required before Phase 1.
**Owner:** Agent + developer confirmation pending

### [2026-03-20] Background jobs use pg-boss

**Context:** MVP needs background jobs for district ingestion, notifications, and future analytics; implementation plan proposed pg-boss or Bull as options.
**Options considered:** (A) Bull/BullMQ (Redis-based) vs (B) pg-boss (PostgreSQL-based).
**Decision:** Use pg-boss for background job processing.
**Rationale:** Eliminates Redis dependency; Postgres is already the primary database; ACID guarantees and exactly-once delivery suit ingestion and moderation workflows; simpler infrastructure for MVP.
**Impact:** Add pg-boss as dependency; configure with existing Postgres connection; use for ingestion jobs (Phase 3), notifications (Phase 8), and future async work.
**Owner:** Developer

### [2026-03-20] Real-time messaging uses ws (plain WebSockets)

**Context:** MVP requires real-time messaging for 1:1 and group conversations; implementation plan proposed Socket.io or ws.
**Options considered:** (A) Socket.io (rooms, reconnection, fallbacks) vs (B) ws (minimal WebSocket library) vs (C) uWebSockets.js / PartyKit.
**Decision:** Use ws for real-time messaging.
**Rationale:** Prioritize minimalist approach—ws is the minimal, standard WebSocket implementation with no protocol abstraction; smaller surface area to understand and maintain; rooms and reconnection can be built explicitly if needed; Socket.io and others add complexity that may not be necessary at MVP scale.
**Impact:** Add ws as dependency; implement conversation channels and broadcast logic in app layer; defer Socket.io or similar unless production needs (e.g. poor reconnection behavior) justify the switch.
**Owner:** Developer

### [2026-03-20] Backend API uses Fastify

**Context:** Implementation plan proposed Fastify or Hono for the Node/TypeScript backend.
**Options considered:** (A) Fastify vs (B) Hono vs (C) Express.
**Decision:** Use Fastify for the API layer.
**Rationale:** Mature plugin ecosystem for Postgres, websockets, JWT, Swagger; @fastify/websocket integrates ws with the same server; widely used for traditional Node APIs; fits modular monolith deployment on a single long-lived Node process.
**Impact:** Add Fastify and core plugins; use fastify-type-provider-zod or handler-level Zod for validation; @fastify/websocket for real-time messaging routes.
**Owner:** Developer

### [2026-03-20] Auth uses cookie-based sessions

**Context:** Implementation plan proposed JWT or cookie-based sessions for auth.
**Options considered:** (A) JWT (stateless) vs (B) cookie-based session (server-side store).
**Decision:** Use cookie-based sessions for authentication.
**Rationale:** Immediate revocation on logout; HttpOnly cookies reduce XSS risk; single DB and modular monolith means session store is straightforward; no token blacklist needed.
**Impact:** Store session ID in HttpOnly cookie; session row in DB (or Redis if added later); lookup on each authenticated request; logout deletes session server-side.
**Owner:** Developer

### [2026-03-21] Auth implementation uses JWT (Bearer token)

**Context:** Original decision favored cookie-based sessions; implementation diverged.
**Options considered:** (A) Migrate to cookies per original decision vs (B) document JWT as implementation choice.
**Decision:** Document that MVP implementation uses JWT with Bearer token stored in localStorage.
**Rationale:** JWT simplifies SPA + proxy setup; @fastify/jwt already in use; no session table required; can migrate to cookies later if revocation or XSS hardening is needed.
**Impact:** Login returns `token`; frontend stores in localStorage and sends `Authorization: Bearer <token>`; middleware validates JWT. Document for future maintainers; cookie migration remains an option.
**Owner:** Developer

### [2026-03-21] District map view: Nominatim geocoding, Leaflet, dedicated map-data API

**Context:** District data visualization PRD specifies an interactive map view for the ingestion console; need to choose geocoding source, map library, and API approach.
**Options considered:** (A) Nominatim vs Google Geocoding vs static lookup; (B) Leaflet vs Mapbox GL; (C) extend candidates endpoint vs new map-data endpoint.
**Decision:** Use Nominatim for geocoding (free, rate-limited); Leaflet + react-leaflet with OSM tiles; new `GET /admin/ingestion/map-data` returning only map fields with no pagination.
**Rationale:** Nominatim avoids API key; Leaflet is lightweight and PRD-recommended; dedicated endpoint keeps map payload minimal and avoids overloading candidates list contract.
**Impact:** Add `latitude`, `longitude`, `geocoded_at` to district_candidates; geocoding script with 1 req/sec delay; map-data endpoint; Leaflet dependency in frontend. Implementation: Phase 11 (11.1–11.4) in `docs/implementation-plan.md`.
**Owner:** Agent + developer

### [2026-03-20] Membership uses email verification + auto-approval

**Context:** PRD requires membership approval/verification; options included manual admin approval, auto-approve, or email verification.
**Options considered:** (A) Manual admin approval vs (B) Auto-approve vs (C) Email verification only vs (D) Email verification + auto-approval.
**Decision:** Email verification + auto-approval for MVP.
**Rationale:** Email verification blocks throwaway accounts with minimal friction; auto-approval after verification keeps onboarding fast and avoids admin bottleneck; manual approval can be added later for edge cases or if abuse emerges.
**Impact:** Registration flow requires email verification before full access; on successful verification, set membership_status to approved; no admin approval step in MVP.
**Owner:** Developer

### [2026-03-20] District data source is NCES Common Core of Data (CCD)

**Context:** District ingestion needs a source for public district attributes; options included NCES, state agencies, manual entry, CSV, third-party.
**Options considered:** (A) NCES CCD vs (B) State education agency APIs vs (C) Manual/admin entry vs (D) Third-party (e.g. GreatSchools).
**Decision:** Use NCES Common Core of Data (CCD) as the district data source.
**Rationale:** Authoritative federal data; free; structured enrollment, demographics, geography; annual updates sufficient for MVP; widely used for education analytics.
**Impact:** Ingestion pipeline parses CCD files; map to district_attribute_definitions and district_effective_attribute_values; source_label and timestamps per schema.
**Owner:** Developer

### [2026-03-20] District ingestion runs on cron (pg-boss)

**Context:** Ingestion needed a trigger mechanism; options included cron, CLI script, manual, or webhook.
**Options considered:** (A) Scheduled cron via pg-boss vs (B) CLI script on demand vs (C) Manual admin button vs (D) External webhook.
**Decision:** Use pg-boss scheduled jobs (cron) for district ingestion.
**Rationale:** CCD updates annually; scheduled runs keep data current without manual intervention; pg-boss already chosen for background jobs; CLI script can remain for initial load and debugging.
**Impact:** Register pg-boss cron job (e.g. weekly or monthly); idempotent ingestion logic; optional CLI entry point for manual runs.
**Owner:** Developer

### [2026-03-20] Messaging uses LinkedIn-style connections model

**Context:** Messaging gate needed to support both matching-suggested peers and user-initiated outreach; previous decision considered message_requests table.
**Options considered:** (A) Message requests (request-to-message, approve, unlock conversation) vs (B) LinkedIn-style connections (request-to-connect, accept, then either can message).
**Decision:** Use LinkedIn-style connections model.
**Rationale:** Simpler schema—one relationship type (connected) gates messaging; matching becomes "suggested connections" (discovery); users send connection requests to anyone (suggested or not); once accepted, either can start a DM; groups add connected users only; familiar UX pattern.
**Impact:** Add `user_connections` table (user_a, user_b, status: pending | accepted, created_at); connection request API; messaging gate = are we connected?; group invites = connected users only; matching surfaces suggested peers to connect with.
**Owner:** Developer

### [2026-03-20] AI features use OpenAI

**Context:** Phase 9 AI features (summarization, suggested actions) require an LLM provider; options included OpenAI, Anthropic, others.
**Options considered:** (A) OpenAI vs (B) Anthropic vs (C) Other (Google, Mistral).
**Decision:** Use OpenAI for LLM integration.
**Rationale:** Cost-driven; OpenAI generally cheaper across tiers; adequate for summarization and suggested actions; batch API available for async workloads; abstract client to allow future provider switch if needed.
**Impact:** Add OpenAI SDK; use for conversation summarization and suggested next steps; store model_name and prompt_version in user_ai_artifacts; rate limit AI endpoints.
**Owner:** Developer

### [2026-03-20] API and frontend deployed as standalone services

**Context:** Implementation plan did not specify how Fastify API and Next.js frontend relate at deployment.
**Options considered:** (A) Standalone Fastify + separate Next.js vs (B) Next.js API routes as gateway vs (C) Colocated in single Next.js app.
**Decision:** Standalone Fastify API + standalone Next.js frontend.
**Rationale:** Clean separation of concerns; API scales independently; Fastify optimized for API workload; CORS and deploy configuration explicit; fits modular monolith with distinct service boundaries.
**Impact:** Two deployable units (or same host, different ports); Next.js calls Fastify API via fetch; shared types via monorepo package; CORS configured on Fastify.
**Owner:** Developer

### [2026-03-20] Project structure is monorepo

**Context:** Backend and frontend could be in one repo or split.
**Options considered:** (A) Monorepo (apps/api, apps/web, packages/shared) vs (B) Split repos vs (C) Single app.
**Decision:** Use monorepo structure.
**Rationale:** Shared types and contracts; atomic cross-stack changes; single clone for local dev; clear separation via apps/ and packages/ structure.
**Impact:** Structure as apps/api (Fastify), apps/web (Next.js), packages/shared (types, validation); use Turborepo or similar for build orchestration.
**Owner:** Developer

### [2026-03-20] Database access uses Drizzle ORM

**Context:** Implementation plan proposed raw `pg` or Drizzle for database access; Prisma is another ORM option.
**Options considered:** (A) Raw `pg` vs (B) Drizzle vs (C) Prisma.
**Decision:** Use Drizzle ORM with `pg` driver.
**Rationale:** Type-safe queries without schema-first lock-in; lighter than Prisma; aligns with existing raw SQL schema (can map incrementally); good TypeScript inference; migrations can coexist with existing schema/*.sql or migrate over time.
**Impact:** Add Drizzle and drizzle-orm; define schema reflecting existing tables or use raw SQL where needed; use pg as underlying driver; optional drizzle-kit for migrations.
**Owner:** Developer

## Review/Validate

### [2026-03-21] Frontend–backend communication: proxy, IPv4, and route alignment

**Context:** Local dev was failing with 404s on auth, ECONNREFUSED to ::1:3001, and route mismatches between Next.js proxy and Fastify.
**Options considered:** (A) Direct backend calls from frontend vs (B) Next.js rewrite proxy for same-origin API requests; (C) localhost vs 127.0.0.1 for backend URL; (D) backend routes at / vs /api prefix.
**Decision:** Use Next.js rewrites to proxy /api/* to backend; use 127.0.0.1 instead of localhost to avoid IPv6 (::1) connection refused on macOS; add /api prefix to all Fastify routes; route frontend through /api proxy by default in browser.
**Rationale:** Same-origin API requests avoid CORS issues and work when backend runs on a different port; 127.0.0.1 forces IPv4 where backend listens on 0.0.0.0; /api prefix keeps proxy rewrite and backend routes in sync.
**Impact:** next.config.js rewrites /api/:path* → http://127.0.0.1:3001/api/:path*; backend registers routes with prefix /api; frontend api.ts uses /api base in browser (or NEXT_PUBLIC_API_URL when set); next.config.ts replaced with next.config.js for Next.js 14 compatibility.
**Owner:** Developer

### [2026-03-21] Real district data ingestion PRD added to fill requirement gap

**Context:** Implementation plan Phase 3 and the existing ingestion script only supported sample/demo fixture data; the plan explicitly excluded "broad dataset ingestion." No spec existed for ingesting real school district data.
**Options considered:** (A) Continue with sample data only vs (B) document requirements for real data ingestion as a separate PRD.
**Decision:** Add `docs/prds/district-data-ingestion.md` specifying real NCES-backed ingestion for an initial 100 districts, plus an internal moderator-facing ingestion console (preview, trigger, monitor, edit).
**Rationale:** Fills the gap between demo-only MVP and eventual production readiness; provides a clear scope (100 districts, NCES source) and operational workflow (moderator UI, audit trail) without committing to full US coverage.
**Impact:** New PRD defines ingestion console UX, source assumptions, and phased rollout; implementation should reference `docs/prds/district-data-ingestion.md` when building real-data ingestion.
**Owner:** Developer

