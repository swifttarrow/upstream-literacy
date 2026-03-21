# Generate Milestones & Tasks from Plan

Takes an implementation plan and generates a structured milestone/task breakdown under `docs/milestones/`.

---

## When to Use

- After a plan is approved and before implementation
- When you need granular, trackable tasks for each phase
- When coordinating work across sessions or team members

---

## Input

You will receive:

1. **Plan path** — e.g. `docs/plans/2025-03-06-sessionlens.md`
2. Optional: custom milestone naming, task granularity preferences

Read the plan completely before generating.

---

## Output Structure

```
docs/milestones/
├── m1-milestone-slug/
│   ├── README.md          # Milestone overview, success criteria, dependencies
│   ├── 001-task-slug.md
│   ├── 002-task-slug.md
│   └── ...
├── m2-milestone-slug/
│   ├── README.md
│   ├── 001-task-slug.md
│   └── ...
└── _index.md              # Master index: milestones, order, links to plan
```

---

## Process

### Step 1: Parse the Plan

1. Read the plan file fully
2. Identify phases/sections that map to milestones (e.g. "Phase 1: ...", "Phase 2: ...")
3. Extract for each phase:
   - Overview / goal
   - Changes required (files, logic, config)
   - Success criteria (automated + manual verification)
   - Dependencies on prior phases

### Step 2: Create Milestone Directories

For each phase in the plan:

- Create `docs/milestones/mN-slug/` where:
  - `mN` = phase number prefixed by `m`, no leading zero (m1, m2, ...)
  - `slug` = kebab-case from phase title (e.g. `project-setup-webrtc`)

### Step 3: Write Milestone README

Each `docs/milestones/mN-slug/README.md` must include:

```markdown
# Milestone N: [Phase Title]

## Overview
[From plan phase overview]

## Dependencies
- [ ] Milestone N-1 (if applicable)
- [ ] [Other prerequisites]

## Changes Required
[Summarized from plan; link to plan section]

## Success Criteria

### Automated Verification
- [ ] [From plan]

### Manual Verification
- [ ] [From plan]

## Tasks
- [001-task-slug](./001-task-slug.md)
- [002-task-slug](./002-task-slug.md)
```

### Step 4: Decompose into Tasks

Break each phase into **concrete, implementable tasks**. Each task should:

- Be completable in one focused session (roughly 30–90 min)
- Have a clear deliverable (file created, test passing, etc.)
- Be ordered so dependencies are respected

**Task file format** — `docs/milestones/mN-slug/MMM-task-slug.md`:

```markdown
# Task MMM: [Short Title]

## Goal
[One sentence: what this task accomplishes]

## Deliverables
- [ ] [Concrete output 1]
- [ ] [Concrete output 2]

## Notes
[Relevant file paths, config, or gotchas from the plan]

## Verification
[How to confirm this task is done]
```

Use `MMM` = zero-padded task number (001, 002, …) within each milestone.

### Step 5: Create Master Index

Create `docs/milestones/_index.md`:

```markdown
# Milestones: [Plan Title]

**Source plan:** [path to plan]

## Milestone Order

| # | Milestone | Status |
|---|-----------|--------|
| 1 | [m1-slug](./m1-slug/) | Pending |
| 2 | [m2-slug](./m2-slug/) | Pending |
| ... | ... | ... |

## Quick Links
- [Plan](../YYYY-MM-DD-plan-name.md)
- [Research](../../research/...) (if referenced)
```

---

## Guidelines

- **One milestone per plan phase** — preserve the plan's phase structure
- **Tasks are atomic** — each task = one logical unit of work
- **Preserve success criteria** — copy automated and manual verification from the plan into milestone READMEs
- **Link back to plan** — each milestone README should reference the source plan section
- **Slug consistently** — use `mN-` prefix + kebab-case slug, no spaces, lowercase
- **Respect order** — milestones and tasks follow the plan's dependency order

---

## Example Mapping (SessionLens)

| Plan Phase | Milestone Dir | Example Tasks |
|------------|---------------|---------------|
| Phase 1: Project Setup & WebRTC | `m1-project-setup-webrtc/` | Create package.json, Add LiveKit client, Frame sampler, Token API |
| Phase 2: Face Detection & Gaze | `m2-face-detection-gaze/` | MediaPipe init, Gaze derivation, Pipeline orchestration |
| Phase 3: Audio Pipeline | `m3-audio-pipeline/` | Silero VAD, Talk-time aggregation, Pipeline wiring |
| ... | ... | ... |

---

## Invocation

Attach this prompt and the plan, then:

> Generate milestones and tasks from @docs/plans/[plan-file].md

Or:

> Create milestone breakdown for the SessionLens plan
