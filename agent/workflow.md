# Research → Plan → Implement → Validate Workflow

A HumanLayer-inspired workflow for complex tasks.

**Greenfield projects only.** This workflow is designed for new projects and codebases. For brownfield (existing) codebases, use a different approach—the research/plan/implement flow assumes you're building from scratch, not integrating into established systems.

## Tool Split

| Phase | Tool | Why |
|-------|------|-----|
| Research | **Cursor** | Rules, context, human review of findings |
| Plan | **Cursor** | Interactive iteration, rules, human approval |
| Implement | **Claude Code** | Terminal-based execution, phase-by-phase |
| Validate | **Cursor** | Review implementation against plan |

---

## When to Use This Workflow

| Use this workflow | Skip to Implement |
|-------------------|-------------------|
| **Greenfield projects** (new codebases) | Brownfield / existing codebases |
| Complex features or refactors | Simple, single-file changes |
| Multi-file implementations | Small bug fixes |
| Need mental alignment across sessions | Obvious one-liners |

---

## Phase 1: Research

**Goal**: Understand the codebase—what exists, where, how it works. No code changes, no suggestions.

### How to Run (Cursor)

Attach `@agent/prompts/research.md`, then: "Research the codebase to answer: [your question]"

### Output

- **Artifact**: `docs/research/YYYY-MM-DD-description.md`
- **Rules applied**: `10-codebase-research.mdc` (when working in `docs/research/`)

### Key Rules

- **Document, don't evaluate**—no improvements, refactors, or critiques
- Use parallel sub-tasks for different aspects
- Include file:line references
- Synthesize findings before writing

### Human Checkpoint

Review the research doc before planning. A bad research doc → thousands of bad lines of code.

---

## Phase 2: Plan

**Goal**: Create a detailed implementation plan with phases, success criteria, and verification steps.

### Prerequisites

- Research doc (or sufficient codebase understanding)
- Clear task/ticket description

### How to Run (Cursor)

Attach `@agent/prompts/plan.md` and `@docs/research/[your-research].md`, then: "Create an implementation plan for [task]"

### Output

- **Artifact**: `docs/plans/YYYY-MM-DD-description.md`
- **Rules applied**: `20-planning.mdc` (when working in `docs/plans/`)

### Plan Structure

Each phase must include:

- **Automated Verification**: Commands to run (`make test`, `npm run lint`, etc.)
- **Manual Verification**: Steps requiring human testing
- **What We're NOT Doing**: Explicit out-of-scope items

### Human Checkpoint

Review and approve the plan before implementation. A bad plan → hundreds of bad lines of code.

---

## Phase 2.5: Milestones (Optional)

**Goal**: Break an approved plan into trackable milestones and tasks.

### When to Run

After plan approval, when you want granular task tracking or coordination across sessions.

### How to Run (Cursor)

Attach `@agent/prompts/milestones-from-plan.md` and `@docs/plans/[your-plan].md`, then: "Generate milestones and tasks from [plan path]"

### Output

- **Artifact**: `docs/milestones/` with:
  - `_index.md` — master index
  - `NN-milestone-slug/README.md` — per-milestone overview
  - `NN-milestone-slug/tasks/MMM-task-slug.md` — individual tasks

### Human Checkpoint

Review task granularity; adjust if tasks are too coarse or too fine.

---

## Phase 3: Implement

**Goal**: Execute the plan phase-by-phase, verifying each step before proceeding.

### Prerequisites

- Approved plan in `docs/plans/`

### How to Run (Claude Code)

From Cursor's terminal:

```
claude
/implement [milestone-id]
```

Example: `/implement 01-project-setup-webrtc`. Claude Code reads from `docs/milestones/` and executes all tasks in the milestone.

### Output

- Code changes
- Updated checkboxes in the plan
- Pause after each phase for human verification

### Key Rules

- Follow the plan's intent; on mismatch, STOP and explain
- Run automated verification after each phase
- Pause for manual verification unless instructed to run multiple phases
- Trust completed checkmarks when resuming

### Human Checkpoint

After each phase: run manual verification from the plan, then confirm before next phase.

---

## Phase 4: Validate

**Goal**: Verify implementation against the plan. Run checks, identify gaps, produce a report.

### When to Run

After implementation is complete (ideally after commit, before PR).

### How to Run (Cursor)

Attach `@agent/prompts/validate.md` and `@docs/plans/[your-plan].md`, then: "Validate the implementation against docs/plans/[file].md"

### Output

- Validation report (in chat or `docs/handoffs/`)
- Pass/fail for automated verification
- Manual testing checklist
- Deviations and recommendations

### Recommended Order

1. Implement → 2. Commit → 3. Validate → 4. PR description

---

## Handoff (Between Sessions)

When switching between Cursor and Claude Code, or to a new session:

**Cursor**: Attach `@agent/prompts/handoff.md`, then: "Create a handoff for the current work"

### Output

- **Artifact**: `docs/handoffs/YYYY-MM-DD_HH-MM-SS_description.md`

### Resume

In a new session: "Read docs/handoffs/[file].md and continue from the Action Items."

---

## Quick Reference

| Phase | Tool | Invocation |
|-------|------|------------|
| Research | Cursor | `@agent/prompts/research.md` + "Research: [question]" |
| Plan | Cursor | `@agent/prompts/plan.md` + research + "Create plan for [task]" |
| **Milestones** | Cursor | `@agent/prompts/milestones-from-plan.md` + plan + "Generate milestones and tasks" |
| Implement | **Claude Code** | `claude` → `/implement [milestone]` |
| Validate | Cursor | `@agent/prompts/validate.md` + plan + "Validate..." |
| Handoff | Cursor | `@agent/prompts/handoff.md` + "Create handoff" |

---

## Context Management (HumanLayer Principle)

- **Target**: Keep context utilization in 40–60%
- **Compaction**: Distill findings into `docs/` artifacts between phases
- **Human leverage**: Review research and plans—highest ROI
- **Specs as source of truth**: Plans and research guide implementation

---

## Artifact Locations

| Type | Path |
|------|------|
| Research | `docs/research/` |
| Plans | `docs/plans/` |
| Milestones & Tasks | `docs/milestones/` |
| Handoffs | `docs/handoffs/` |
