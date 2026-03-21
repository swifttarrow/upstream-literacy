You are a senior software architect and database designer.

Generate a **full production-oriented relational database schema** based on the existing PRD in this project.

Assume:
- the PRD already exists in the repo/workspace
- you should read and use it as the source of truth
- if multiple PRD-like files exist, choose the one that most clearly represents the latest MVP scope and explain which file you used

## Goal
Design the PostgreSQL schema for the MVP described in the PRD. The schema should be practical, implementation-ready, and aligned with the product and architecture decisions already documented.

## What to do first
1. Find and read the PRD from the project files
2. Extract the key product, architecture, and data-model requirements
3. Identify any ambiguities that materially affect schema design
4. Make explicit recommendations where needed
5. Then generate the full schema

## Output format
Produce your response in the following sections:

1. **PRD source used**
   - file path(s)
   - brief summary of the assumptions extracted

2. **Schema assumptions**
   - list the important assumptions you are making from the PRD
   - clearly note ambiguities and how you resolved them

3. **Entity list**
   - concise list of core entities

4. **Relational schema**
   For each table include:
   - table name
   - purpose
   - columns
   - data types
   - nullability
   - default values
   - primary key
   - foreign keys
   - unique constraints
   - check constraints
   - indexes

5. **Relationship summary**
   - summarize key one-to-one, one-to-many, and many-to-many relationships

6. **Recommended enums / lookup tables**
   - identify which should be DB enums vs lookup tables vs constrained text

7. **Audit / history strategy**
   - explain how auditability and historical data should work

8. **Soft delete / archival strategy**
   - explain where soft deletes should be used and where they should not

9. **Permission-sensitive data notes**
   - explain any schema implications of the moderation and access model

10. **Migration order**
    - recommend a safe order for creating the schema

11. **SQL DDL**
    - generate PostgreSQL-flavored `CREATE TABLE` statements
    - include indexes
    - include constraints
    - include enums if recommended

12. **Future-proofing notes**
    - what should remain flexible for v2+

## Design constraints
Use these unless the PRD strongly suggests otherwise:
- PostgreSQL
- UUID primary keys
- `timestamptz` timestamps
- modular monolith MVP
- normalized schema where practical
- explicit join tables for many-to-many relationships
- separate users and districts
- generic conversations model with direct/group types
- append-only or snapshot-friendly district ingestion history
- admin overrides modeled separately from ingested public data
- configurable taxonomy structure
- auditability for moderation/admin actions
- support for user-scoped AI artifacts
- avoid premature tables for ML/precomputed matching graphs unless clearly justified

## The schema must support
At minimum, support the capabilities described in the PRD, including:
- users
- district association
- member / moderator / admin access
- profile completion / soft gating support
- district public-data ingestion
- district attribute snapshots
- admin overrides
- problem taxonomy
- primary + secondary problem selections
- filtering and matching support
- exact vs close match labeling support if needed at query/app level
- direct conversations
- group conversations
- max group size of 8
- messages
- reports
- moderation actions
- audit logs
- notifications
- seeded/demo profiles if the PRD supports cold-start seeding
- user-scoped AI summaries and suggested actions

## Important instructions
- Do **not** invent major product features not supported by the PRD
- Do **not** over-optimize for speculative scale
- Do **not** collapse distinct concepts just to reduce table count
- Include lifecycle fields such as `created_at`, `updated_at`, and status fields where appropriate
- If a rule is better enforced in the app layer than the DB layer, say so explicitly
- If a rule can be partially enforced in the DB and fully enforced in the app, explain both
- For any major modeling choice, explain **why** you chose it

## Specific design questions to answer
Make strong recommendations on:
- whether roles should be a join table, enum, or both
- how to model district attribute snapshots vs current denormalized district columns
- how to model taxonomy categories/tags/status/versioning
- how to enforce exactly one primary problem selection per user
- how to model direct vs group conversations safely
- how to enforce group max size = 8
- how to support seeded/demo profiles without polluting real community data
- how to model reports against users, messages, and/or conversations
- how to structure audit logs for moderation/admin actions
- how to store AI summaries / AI suggestions so they remain user-scoped

## Final review pass
After generating the schema, do a second-pass review and call out:
1. normalization issues
2. likely performance bottlenecks
3. missing indexes
4. constraints that should live in DB vs app layer
5. fields better modeled as enums vs text
6. tables that may be premature for MVP
7. PRD ambiguities that still need product clarification