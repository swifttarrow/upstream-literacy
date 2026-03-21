# Generate Exhaustive User Stories from PRD & Milestones

Takes the PRD and all milestones/tasks, and generates a comprehensive list of user stories with traceability to requirements and implementation.

---

## When to Use

- After milestones are defined, to establish user-facing acceptance criteria
- Before or during implementation, to ensure full product coverage
- For QA/test planning, sprint planning, or stakeholder alignment

---

## Input

1. **PRD** — `docs/prd.md` (users, core jobs, functional requirements 8.1–8.11, MVP scope)
2. **Milestones** — `docs/plans/milestones/` (all README.md files and task files)

Read the PRD fully, then every milestone README and every task file. Do not skip any.

---

## Output

Write to `docs/user-stories.md` (or a path you specify).

---

## User Story Format

Use the standard format:

```
As a [role], I want to [action/capability] so that [benefit/outcome].
```

**Roles** (from PRD §5):

- **District staff** — primary users (school district admins, curriculum leaders)
- **Moderator** — content review, reports, suspension
- **Platform admin** — taxonomy, district data overrides, audit

**Acceptance criteria** (optional but recommended):

- Gherkin-style: `Given [context] When [action] Then [outcome]`
- Or bullet list of verifiable conditions

---

## Process

### Step 1: Build Requirement Matrix

1. Extract from PRD:
   - Every user type (primary, secondary)
   - Every functional requirement section (8.1–8.11)
   - Every core user job (§6)
   - Every explicit capability in MVP scope (§12)

2. Extract from milestones:
   - Every manual verification item in milestone READMEs
   - Every task goal and deliverable
   - Every “user can…” or “admin can…” statement

### Step 2: Decompose into User Stories

For each capability:

1. Identify the **role** (who benefits)
2. State the **action** in user terms (what they do), not implementation terms
3. State the **benefit** (why it matters)

**Be exhaustive.** Generate user stories for:

- Happy paths
- Edge cases (e.g., reject connection, leave group, view when suspended)
- Error/validation flows (e.g., incomplete profile blocks messaging)
- Admin/moderator workflows
- Read-only vs write actions

### Step 3: Add Traceability

For each user story, add:

- **Source:** PRD section (e.g., §8.3) and/or milestone task (e.g., m2/001-users-me-profile-crud)
- **Priority:** Must-have (MVP) | Should-have | Nice-to-have (infer from PRD MVP scope and milestone order)

---

## Output Structure

```markdown
# User Stories: District Community Matching Platform

**Source:** PRD (§1–14), Milestones (m1–m10)  
**Generated:** [date]

---

## By Role

### District Staff

#### Authentication & Access
- As a **district staff member**, I want to **register and log in** so that **I can access the platform**.
  - Source: PRD §8.1, m1/004-auth-routes-register-login
  - Priority: Must-have
  - Acceptance: Given valid credentials When I submit login Then I receive a session token

#### User Profiles
- [Continue...]

### Moderator
- [Stories...]

### Platform Admin
- [Stories...]

---

## By Milestone

| Milestone | User Stories |
|-----------|--------------|
| m1 | US-001, US-002, ... |
| m2 | US-003, US-004, ... |
| ... | ... |

---

## By PRD Section

| § | Section | User Stories |
|---|---------|--------------|
| 8.1 | Auth & Access | US-001, US-002 |
| 8.2 | User Profiles | US-003, ... |
| ... | ... | ... |

---

## Index (All Stories)

| ID | Role | Summary | Priority |
|----|------|---------|----------|
| US-001 | District staff | Register and log in | Must-have |
| ... | ... | ... | ... |
```

---

## Guidelines

- **User-centric language** — “I want to send a connection request,” not “Implement POST /connections”
- **One capability per story** — split “send and accept connection requests” into two stories
- **Cover negative flows** — reject, leave, block, suspend, validation failures
- **Don’t invent scope** — only derive from PRD and milestones; flag gaps in a “Potential Gaps” section
- **Include non-obvious stories** — e.g., “As a district staff member, I want to see why I’m matched with someone so that I can decide whether to connect”
- **Cross-reference** — same story can map to multiple PRD sections and tasks

---

## Invocation

Attach this prompt and the inputs, then:

> Generate exhaustive user stories from @docs/prd.md and @docs/plans/milestones/

Or:

> Create user stories for the District Community Matching Platform using the PRD and milestones
