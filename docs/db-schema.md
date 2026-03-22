# PostgreSQL schema — MVP (from PRD)

Generated using `agent/prompts/modeling.md` against `docs/prds/base.md`.

---

## 1. PRD source used

- **File:** `docs/prds/base.md`
- **Assumptions extracted:** Modular monolith, Postgres, identity + districts + taxonomy + matching + connections + conversations + moderation + notifications + user-scoped AI; no ML graph, no public feed; groups max 8 from connected users only; soft gate for messaging (district + primary problem); seeded/demo possible for cold start; moderation with metadata-for-all / content-only-when-reported is primarily an **application authorization** concern, not a column-per-row visibility model in the DB.

---

## 2. Schema assumptions

| Assumption | Rationale |
|------------|-----------|
| One **platform** role per user (`member` \| `moderator` \| `admin`) | PRD lists three roles; MVP avoids multi-role matrix. Elevated roles imply member capabilities in the app layer. |
| **Professional** role (job title) is separate text on profile | PRD “Name, role, district” is district job context, not RBAC. |
| `membership_status` covers approval + suspension | PRD: approval/verification and suspension. |
| District “current” display merges **latest ingestion snapshot** + **admin overrides** | PRD: source + timestamp + overrides; append-only ingestion history. |
| **Exact vs close match** is computed at query time | PRD requires labeling in UX; no requirement to persist match runs in MVP. |
| **Match explanations** computed in app | Not listed as persisted artifacts; avoid extra tables. |
| Reports use **polymorphic target** with a CHECK | One table for user / message / conversation targets. |
| **Geography** stored as structured fields on `districts` | PRD filter by geography; normalize as columns unless you prefer generic attributes only (see ambiguities). |

**Ambiguities resolved**

- **District attribute shape:** PRD says bucketed/normalized but not a fixed schema. Chose `district_attribute_definitions` + `district_effective_attribute_values` for configurable keys; ingestion stores JSON snapshot append-only for audit/replay.
- **“Role” filter in matching:** Treated as **professional role** text (indexed/trigram optional later), not platform RBAC.
- **Moderation content visibility:** DB does not model “moderator sees ciphertext”; enforce via API and optional future `message_content_storage` split. MVP stores message body in `messages.body`; access rules in app.

---

## 3. Entity list

- `users` — identity, platform role, membership lifecycle, profile, district link, demo flag  
- `districts` — district identity + geography faceting  
- `district_ingestion_events` — append-only ingest history  
- `district_attribute_definitions` — configurable district attribute keys/types  
- `district_effective_attribute_values` — resolved current values + provenance pointers  
- `district_admin_overrides` — override rows (separate from ingest)  
- `problem_categories`, `problem_statements` — admin-managed taxonomy  
- `user_problem_selections` — primary + secondaries  
- `user_connections` — LinkedIn-style connections (pending | accepted); gate for messaging  
- `conversations`, `conversation_participants` — direct + group  
- `conversation_direct_pairs` — stable uniqueness for 1:1 threads  
- `messages`  
- `reports`, `moderation_actions`  
- `audit_log_entries`  
- `notifications`  
- `user_ai_artifacts` — user-scoped summaries / suggestions  

---

## 4. Relational schema (per table)

### `users`

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|--------|
| id | uuid | NO | gen_random_uuid() | PK |
| email | citext | NO | — | UNIQUE |
| password_hash | text | YES | — | If using external IdP, nullable |
| full_name | text | NO | — | |
| professional_role | text | YES | — | Job role for matching filter |
| bio | text | YES | — | |
| district_id | uuid | YES | — | FK → districts |
| platform_role | platform_role | NO | 'member' | |
| membership_status | membership_status | NO | 'pending' | |
| is_demo_profile | boolean | NO | false | Cold-start seeding |
| profile_completed_at | timestamptz | YES | — | Set when district + primary problem satisfied (app) |
| suspended_until | timestamptz | YES | — | NULL = not suspended |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

**PK:** `id`  
**FK:** `district_id` → `districts(id)`  
**UNIQUE:** `email`  
**Indexes:** `(district_id)`, `(membership_status)`, `(is_demo_profile)` where needed for matching queries  
**CHECK:** (optional app) messaging gate not in DB  

---

### `districts`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | — |
| slug | text | YES | — | UNIQUE partial where not null |
| country_code | char(2) | YES | — |
| state_region | text | YES | — | geography filter |
| city | text | YES | — |
| external_ref | text | YES | — | source system id |
| is_demo | boolean | NO | false |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Indexes:** `(state_region)`, `(country_code, state_region)`  

---

### `district_ingestion_events` (append-only)

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| district_id | uuid | NO | — |
| source_label | text | NO | — |
| ingested_at | timestamptz | NO | now() |
| normalized_attributes | jsonb | NO | '{}' | bucketed snapshot |
| raw_payload | jsonb | YES | — | optional debug/audit |

**FK:** `district_id` → `districts(id)`  
**Indexes:** `(district_id, ingested_at DESC)`  

---

### `district_attribute_definitions`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| key | text | NO | — | UNIQUE |
| label | text | NO | — |
| value_type | text | NO | — | 'text' \| 'number' \| 'enum' — app-enforced |
| sort_order | int | NO | 0 |
| created_at | timestamptz | NO | now() |

---

### `district_effective_attribute_values`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| district_id | uuid | NO | — |
| definition_id | uuid | NO | — |
| value_text | text | YES | — |
| value_number | numeric | YES | — |
| value_json | jsonb | YES | — | enum list / structured |
| provenance | district_value_provenance | NO | — | ingest \| override |
| last_ingestion_event_id | uuid | YES | — | FK |
| last_override_id | uuid | YES | — | FK |
| updated_at | timestamptz | NO | now() |

**UNIQUE:** `(district_id, definition_id)`  
**FKs:** district, definition, optional ingestion + override  

---

### `district_admin_overrides`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| district_id | uuid | NO | — |
| definition_id | uuid | NO | — |
| value_text | text | YES | — |
| value_number | numeric | YES | — |
| value_json | jsonb | YES | — |
| admin_user_id | uuid | NO | — |
| reason | text | YES | — |
| created_at | timestamptz | NO | now() |

**FKs:** `district_id`, `definition_id`, `admin_user_id` → `users`  

---

### `problem_categories`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| parent_id | uuid | YES | — | self-FK |
| name | text | NO | — |
| slug | text | NO | — | UNIQUE |
| sort_order | int | NO | 0 |
| created_at | timestamptz | NO | now() |

---

### `problem_statements`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| category_id | uuid | NO | — |
| code | text | NO | — | UNIQUE |
| label | text | NO | — |
| description | text | YES | — |
| status | taxonomy_status | NO | 'active' |
| sort_order | int | NO | 0 |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**FK:** `category_id` → `problem_categories`  
**Index:** `(category_id, status)`  

---

### `user_problem_selections`

| Column | Type | Null | Default |
|--------|------|------|---------|
| user_id | uuid | NO | — |
| problem_statement_id | uuid | NO | — |
| is_primary | boolean | NO | false |
| created_at | timestamptz | NO | now() |

**PK:** `(user_id, problem_statement_id)`  
**FKs:** user, problem_statement  
**Unique partial index:** one row per user where `is_primary` (see DDL)  

---

### `user_connections` (LinkedIn-style)

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_a_id | uuid | NO | — |
| user_b_id | uuid | NO | — |
| status | connection_status | NO | 'pending' |
| requested_by_user_id | uuid | NO | — |
| created_at | timestamptz | NO | now() |
| resolved_at | timestamptz | YES | — |

**PK:** `id`  
**UNIQUE:** `(user_a_id, user_b_id)`  
**CHECK:** `user_a_id < user_b_id`; `requested_by_user_id` must be user_a or user_b  
**FKs:** user_a_id, user_b_id, requested_by_user_id → users  
**Indexes:** `(user_a_id)`, `(user_b_id)`, `(status)`, `(requested_by_user_id)`  
**Enum:** `connection_status` ('pending', 'accepted')  

Messaging gate: only users with `status = 'accepted'` can direct message. Groups can add participants only from accepted connections.

---

### `conversations`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| type | conversation_type | NO | — |
| shared_problem_statement_id | uuid | YES | — | contextual prompt |
| created_by_user_id | uuid | NO | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**FK:** `shared_problem_statement_id`, `created_by_user_id`  

---

### `conversation_direct_pairs`

| Column | Type | Null | Default |
|--------|------|------|---------|
| conversation_id | uuid | NO | — |
| user_low_id | uuid | NO | — |
| user_high_id | uuid | NO | — |

**PK:** `conversation_id`  
**UNIQUE:** `(user_low_id, user_high_id)`  
**CHECK:** `user_low_id < user_high_id`  
**FK:** conversation, both users  

---

### `conversation_participants`

| Column | Type | Null | Default |
|--------|------|------|---------|
| conversation_id | uuid | NO | — |
| user_id | uuid | NO | — |
| joined_at | timestamptz | NO | now() |
| left_at | timestamptz | YES | — |

**PK:** `(conversation_id, user_id)`  
**FKs:** conversation, user  
**Index:** `(user_id, left_at)` for inbox  

---

### `messages`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| conversation_id | uuid | NO | — |
| sender_id | uuid | NO | — |
| body | text | NO | — |
| created_at | timestamptz | NO | now() |
| edited_at | timestamptz | YES | — |
| deleted_at | timestamptz | YES | — | soft delete |

**FKs:** conversation, sender  
**Index:** `(conversation_id, created_at DESC)`  

---

### `reports`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| reporter_id | uuid | NO | — |
| target_type | report_target_type | NO | — |
| target_user_id | uuid | YES | — |
| target_message_id | uuid | YES | — |
| target_conversation_id | uuid | YES | — |
| reason_code | text | NO | — |
| details | text | YES | — |
| status | report_status | NO | 'open' |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| resolved_at | timestamptz | YES | — |

**FKs:** reporter, optional targets  
**CHECK:** exactly one target FK non-null matching `target_type` (DDL)  
**Index:** `(status, created_at DESC)`  

---

### `moderation_actions`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| report_id | uuid | YES | — | optional for proactive admin actions |
| moderator_id | uuid | NO | — |
| action_type | moderation_action_type | NO | — |
| notes | text | YES | — |
| metadata | jsonb | NO | '{}' |
| created_at | timestamptz | NO | now() |

**FKs:** report, moderator  

---

### `audit_log_entries` (append-only)

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| actor_user_id | uuid | YES | — | system actions nullable |
| action | text | NO | — |
| entity_type | text | NO | — |
| entity_id | uuid | YES | — |
| metadata | jsonb | NO | '{}' |
| created_at | timestamptz | NO | now() |

**Index:** `(entity_type, entity_id, created_at DESC)`, `(actor_user_id, created_at DESC)`  

---

### `notifications`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| type | notification_type | NO | — |
| title | text | NO | — |
| body | text | YES | — |
| payload | jsonb | NO | '{}' |
| read_at | timestamptz | YES | — |
| created_at | timestamptz | NO | now() |

**FK:** user  
**Index:** `(user_id, created_at DESC)` partial `WHERE read_at IS NULL` optional  

---

### `user_ai_artifacts`

| Column | Type | Null | Default |
|--------|------|------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — | owner / scope |
| conversation_id | uuid | NO | — |
| kind | ai_artifact_kind | NO | — |
| content | jsonb | NO | — |
| model_name | text | YES | — |
| prompt_version | text | YES | — |
| created_at | timestamptz | NO | now() |

**FKs:** user, conversation  
**Index:** `(user_id, conversation_id, kind, created_at DESC)`  

---

## 5. Relationship summary

- **users — districts:** many-to-one (`users.district_id`)  
- **districts — ingestion:** one-to-many append-only  
- **districts — effective attributes:** one-to-many (one row per definition)  
- **districts — overrides:** one-to-many  
- **categories — problems:** one-to-many  
- **users — problem statements:** many-to-many via `user_problem_selections` (at most one `is_primary` per user)  
- **users — users:** many-to-many via `user_connections` (LinkedIn-style; status pending | accepted)  
- **conversations — users:** many-to-many via `conversation_participants`; direct threads also `conversation_direct_pairs`  
- **conversations — messages:** one-to-many  
- **reports — moderation_actions:** one-to-many  
- **users — notifications:** one-to-many  
- **users — ai artifacts:** one-to-many (per conversation)  

---

## 6. Recommended enums / lookup tables

| Concept | Recommendation |
|---------|----------------|
| Platform RBAC | **Enum** `platform_role` |
| Membership / suspension | **Enum** `membership_status` + `suspended_until` |
| Conversation type | **Enum** `conversation_type` |
| Report lifecycle | **Enum** `report_status` |
| Report target | **Enum** `report_target_type` |
| Moderation action | **Enum** `moderation_action_type` |
| Notification type | **Enum** `notification_type` (includes `connection_request`, `connection_accepted`) |
| Connection status | **Enum** `connection_status` |
| Taxonomy visibility | **Enum** `taxonomy_status` |
| AI artifact kind | **Enum** `ai_artifact_kind` |
| District value provenance | **Enum** `district_value_provenance` |
| Report / moderation reason codes | **Lookup table** if you want admin-editable codes; else constrained text + app validation |

---

## 7. Audit / history strategy

- **Append-only:** `district_ingestion_events`, `audit_log_entries` — no updates/deletes in normal operation.  
- **Domain updates:** `updated_at` on mutable entities; moderation and membership changes also recorded in `audit_log_entries` with `metadata` (before/after optional).  
- **Ingestion replay:** `normalized_attributes` + timestamps; effective table can be rebuilt from history + overrides (with clear merge rules in app).  

---

## 8. Soft delete / archival strategy

- **Use soft delete:** `messages.deleted_at` (content may be hidden in UI; moderation policy may still retain for trust/safety).  
- **Do not soft-delete:** users/districts in MVP unless product requires “deactivated account”; prefer `membership_status` + `suspended_until` over deleting users.  
- **Conversations:** archive via `conversation_participants.left_at` rather than deleting conversation rows (preserves history).  

---

## 9. Permission-sensitive data notes

- **Moderation:** Moderators/admins read `messages.body` only through APIs that enforce report-linked access or legal policies; the schema does not implement row-level security by default—enable **RLS** later if needed.  
- **AI artifacts:** Always scoped by `user_id`; API must verify requester is that user and a **current participant** of `conversation_id`.  
- **Demo profiles:** `is_demo_profile` / `districts.is_demo` to filter out of “real” discovery if product requires separation.  

---

## 10. Migration order

1. ENUM types  
2. `districts`  
3. `users` (FK to districts)  
4. `district_attribute_definitions`  
5. `district_ingestion_events`  
6. `district_admin_overrides`  
7. `district_effective_attribute_values`  
8. `problem_categories`  
9. `problem_statements`  
10. `user_problem_selections`  
11. `user_connections` (see `schema/07_user_connections.sql`)  
12. `conversations`  
13. `conversation_direct_pairs`  
14. `conversation_participants`  
15. `messages`  
16. `reports`  
17. `moderation_actions`  
18. `audit_log_entries`  
19. `notifications`  
20. `user_ai_artifacts`  
21. Triggers (group size, timestamps)  

---

## 11. SQL DDL

See **`schema/01_extensions_enums.sql`** through **`schema/12_ingestion_console.sql`** (in order) for PostgreSQL `CREATE TYPE` / `CREATE TABLE` / indexes / triggers.

---

## 12. Future-proofing notes

- **RLS** on `messages` for moderator access patterns  
- **Full-text search** on `messages.body`, `users.professional_role`  
- **Match run persistence** if analytics or explanations must be reproducible  
- **Separate `message_attachments`**  
- **IdP-only auth** (drop `password_hash`, add `auth_subject`)  
- **Multi-tenant** districts org hierarchy if product expands beyond single network  

---

## Specific design questions (recommendations)

| Question | Recommendation |
|----------|----------------|
| Roles: join vs enum | **Single enum on `users.platform_role`** for MVP; add `user_roles` join table if a user must hold multiple platform roles simultaneously. |
| Snapshots vs denormalized district columns | **Geography + identity on `districts`**; **flexible attributes** in `district_effective_attribute_values`; **append-only** `district_ingestion_events` with JSON snapshot. |
| Taxonomy versioning | `taxonomy_status` + `updated_at`; add `version` or history table when admins need diffable changes. |
| Exactly one primary problem | **`user_problem_selections.is_primary`** + **partial unique index** on `user_id WHERE is_primary`. |
| Direct vs group safely | **`conversation_type`** + **`conversation_direct_pairs`** for stable 1:1 uniqueness; participants table for both. |
| Group max 8 | **Trigger** on `conversation_participants` counting active rows (`left_at IS NULL`) when `conversations.type = 'group'`. **App must also enforce** for race-free UX. |
| Seeded/demo profiles | **`users.is_demo_profile`** and **`districts.is_demo`**; matching queries exclude or segment explicitly. |
| Reports polymorphism | **Single `reports` table** with `target_type` + nullable FKs + **CHECK** enforcing consistency. |
| Audit logs | **Append-only `audit_log_entries`** with structured `action` + `entity_type` + `entity_id` + `metadata`. |
| AI summaries/suggestions | **`user_ai_artifacts`** with `user_id` + `conversation_id` + `kind`; optional supersede pattern via newer `created_at` or add `superseded_at` later. |

---

## Final review pass

1. **Normalization:** `district_effective_attribute_values` duplicates “current” state derived from ingest+override—acceptable for read performance; must keep in sync in transactions when ingesting/overriding.  
2. **Bottlenecks:** `messages` by `conversation_id`; `notifications` by `user_id`; matching may scan `users` + selections—index `(problem_statement_id)` on `user_problem_selections` for reverse lookups.  
3. **Missing indexes:** Add `(problem_statement_id)` on `user_problem_selections`; consider GIN on `district_ingestion_events.normalized_attributes` only if you filter inside JSON.  
4. **DB vs app:** Messaging soft-gate (district + primary problem), “connected users only (per user_connections)” group formation, and match ranking/explanation are **app-layer**; group size **DB trigger + app**.  
5. **Enums vs text:** Reason codes as text in MVP—promote to lookup when admins edit codes.  
6. **Premature tables:** None mandatory beyond this set; **do not** add ML/match graph tables until PRD changes.  
7. **Clarify with product:** Whether suspended users’ messages remain visible; whether moderators can read all message bodies without a report (PRD suggests content only when reported—**purely operational/API**, not schema).
