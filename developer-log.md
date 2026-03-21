# Developer Log

Major product and technical decisions are captured here to preserve implementation context.

## Research - General

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

## [2026-03-20] User base restricted to district staff only

**Context:** We needed to define who is in-scope for membership so community trust, relevance, and moderation rules are clear from the start.
**Options considered:** (A) Mixed membership including vendors/consultants/company representatives vs (B) school district staff only.
**Decision:** Assume users are school district staff only; no vendors, consultants, or company representatives.
**Rationale:** Restricting membership to district staff preserves peer relevance, reduces commercial noise, and simplifies trust and moderation policy.
**Impact:** Onboarding and verification should enforce district-staff eligibility; access policies and moderation guidelines should explicitly exclude non-district external roles.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Members can belong to multiple problem areas

**Context:** We needed to decide whether problem-area membership should force a single primary category or allow multi-membership across concurrent needs.
**Options considered:** (A) Single problem-area assignment per member vs (B) multiple problem-area memberships per member.
**Decision:** Members can belong to multiple problem areas at once.
**Rationale:** District staff often work across overlapping priorities, so multi-membership better reflects real workflows and improves relevant discovery.
**Impact:** Data model and matching logic should support many-to-many member-to-problem-area relationships, with filtering and ranking aware of multiple active affinities.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Group conversations supported alongside 1-on-1 messaging

**Context:** We needed to define conversation modes to support both direct peer exchanges and collaborative discussions across small sets of members.
**Options considered:** (A) 1-on-1 messaging only vs (B) support both 1-on-1 and group conversations.
**Decision:** Support group conversations in addition to 1-on-1 messaging.
**Rationale:** Group threads enable richer collaboration around shared problems while preserving direct messaging for focused person-to-person exchanges.
**Impact:** Messaging architecture, permissions, and UX should support participant-managed multi-user threads, while retaining existing controls for direct conversations.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Company moderation posture remains neutral and passive

**Context:** We needed to define how visible and interventionist company moderation should be during member conversations.
**Options considered:** (A) Active/high-touch company moderation in discussions vs (B) neutral/passive moderation that intervenes only when needed.
**Decision:** Company moderation should be neutral and passive, without detracting from member conversations.
**Rationale:** A low-profile moderation posture preserves authentic peer dialogue and trust while still allowing safety enforcement when necessary.
**Impact:** Moderation playbooks should prioritize minimal interruption, clear escalation thresholds, and targeted interventions rather than frequent in-thread company presence.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] MVP uses one unified network directory

**Context:** We needed to choose an MVP network structure that maximizes early connection density while minimizing onboarding complexity.
**Options considered:** (A) One unified network where all users are in a single directory with filters vs (B) multiple segmented community directories from day one.
**Decision:** For MVP, use one unified network directory where all users are discoverable in a single network.
**Rationale:** A unified network maximizes network effects, keeps the data model simpler, reduces onboarding friction ("which community do I join?"), and avoids early fragmentation; the tradeoff is potential noise that must be handled through strong filtering and matching UX.
**Impact:** Discovery should support filtering by district attributes, problem statements, role, and geography (for example: "show suburban districts, 5k-15k students, working on literacy interventions"); product and ranking design should prioritize relevance controls to prevent broad/noisy results.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] MVP starts with a small, high-confidence district dataset

**Context:** We needed to define the initial district data scope for matching and filtering without overfitting the model to noisy or hard-to-maintain fields.
**Options considered:** (A) Ingest broad/complete district data from the start vs (B) launch with a small set of high-confidence, high-signal attributes.
**Decision:** Start with a small, high-confidence dataset rather than trying to include everything at MVP.
**Rationale:** A constrained attribute set improves data quality, simplifies implementation, and makes matching behavior easier to validate and explain early.
**Impact:** MVP data model should include: district type (urban/suburban/rural), enrollment size in buckets (for example: <2k, 2k-10k, 10k-50k, 50k+), state/region, % free/reduced lunch in buckets, % English learners in buckets, and grade bands (for example: K-5, 6-8, 9-12); avoid relying on exact values where bucketed ranges are sufficient.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Messaging allows direct outreach with shared context

**Context:** We needed a messaging model that enables fast peer connection while keeping outreach relevant and reducing low-context cold starts.
**Options considered:** (A) Require approval gates before any direct messaging vs (B) allow direct messaging between matched peers with contextual scaffolding.
**Decision:** Users can directly message matched peers without separate approval, and each message flow includes pre-filled shared context (for example, a common problem area).
**Rationale:** Removing extra approval friction increases connection velocity, while contextual prompts preserve relevance and reduce random cold outreach.
**Impact:** Messaging UX should include contextual metadata in compose/send flows; policy should keep direct messaging tied to matched-peer relationships.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Cold start uses expanded criteria and optional seed profiles

**Context:** We needed a fallback approach for early-stage or sparse-network moments when exact matches may be limited.
**Options considered:** (A) Show no or very few results when strict criteria fail vs (B) progressively broaden criteria and optionally surface seeded/demo profiles.
**Decision:** If exact matches are limited, the system broadens matching criteria to show close matches and may include seeded/demo profiles to preserve a useful first experience.
**Rationale:** Progressive broadening prevents empty states, and seed data helps guarantee meaningful discovery for early users during network ramp-up.
**Impact:** Matching should support tiered recall expansion with clear labeling of close matches; seed/demo profiles must be clearly governed and identifiable in operational policy.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Profile completion gating is soft, not hard

**Context:** We needed to balance low-friction onboarding with minimum profile quality required for high-value interactions.
**Options considered:** (A) Hard gate all exploration until full profile completion vs (B) allow browsing immediately and gate key actions until essential fields are complete.
**Decision:** Use soft gating: users can browse after signup, but actions like messaging are restricted until required profile fields (district plus primary problem) are completed.
**Rationale:** Soft gating improves early engagement and reduces drop-off, while still ensuring enough profile data for relevant, trustworthy interactions.
**Impact:** Access control should enforce action-level prerequisites; onboarding UX should prominently guide users to complete required fields before interaction unlock.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Group conversations can be user-created

**Context:** We needed to define whether small-group collaboration should require moderator setup or be user-driven.
**Options considered:** (A) Moderator/system-created groups only vs (B) user-created small-group conversations around shared needs.
**Decision:** Users can create small-group conversations directly, typically around shared problems or interests, without requiring moderator setup.
**Rationale:** User-created groups increase collaboration speed, support emergent coordination patterns, and reduce operational bottlenecks.
**Impact:** Messaging and permissions should support user-initiated group thread creation, membership controls, and moderation safeguards appropriate for group contexts.
**Owner:** Agent (Codex) + developer confirmation pending

## [2026-03-20] Product direction is community-first with matching foundation

**Context:** We needed to clarify the primary product posture between utility-first matching alone and ongoing community engagement.  
**Options considered:** (A) Match-first transactional experience only vs (B) community-first experience powered by structured matching.  
**Decision:** Prioritize a community-driven experience focused on interaction, conversation, and ongoing engagement, while keeping structured matching as the foundation.  
**Rationale:** Community-first dynamics increase retention and collective value over time, and matching remains the mechanism that anchors relevance and quality.  
**Impact:** Roadmap and UX should emphasize conversational surfaces, repeat engagement loops, and community activity signals in addition to core matching performance.  
**Owner:** Agent (Codex) + developer confirmation pendin

