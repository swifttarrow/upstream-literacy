# Create Takeaways

Generate a high-level TAKEAWAYS.md document summarizing each milestone and task, plus any interesting technical challenges encountered or anticipated.

---

## When to Use

- After implementing one or more milestones
- After validating implementation against a plan
- When wrapping up a work session and you want a compact summary for future reference

---

## Input

You will receive:

1. **Milestone path(s)** — e.g. `docs/milestones/` or specific `docs/milestones/NN-milestone-slug/`
2. Optional: implementation context (what was built, what worked, what didn't)

If no path provided, scan `docs/milestones/` and include all milestones.

---

## Process

### Step 1: Gather Context

1. Read `docs/milestones/_index.md` for milestone order and structure
2. For each milestone in scope:
   - Read `NN-milestone-slug/README.md` (overview, success criteria)
   - Read each task in `tasks/` (goal, deliverables, notes)
3. Optionally: review implementation (git log, key files) to capture what was actually done and any challenges

### Step 2: Synthesize Takeaways

For each milestone:

- **High-level takeaway**: One or two sentences on what this milestone accomplishes and why it matters
- **Per-task takeaways**: Brief bullet for each task (goal + key outcome or gotcha)
- **Technical challenges**: Interesting problems, tradeoffs, or lessons learned (from plan notes or implementation)

### Step 3: Write TAKEAWAYS.md

---

## Output

Create `docs/TAKEAWAYS.md` (or `TAKEAWAYS.md` at project root if preferred):

```markdown
# SessionLens: Milestone Takeaways

High-level takeaways from each milestone and task, plus notable technical challenges.

---

## Milestone 01: [Name]

**Takeaway:** [1–2 sentence summary of what this milestone achieves and why it matters]

### Tasks

- **001-task-slug:** [Brief takeaway — goal and key outcome]
- **002-task-slug:** [Brief takeaway]
- ...

### Technical Challenges

- [Challenge or gotcha 1]
- [Challenge or gotcha 2]

---

## Milestone 02: [Name]

**Takeaway:** [...]

### Tasks

- ...

### Technical Challenges

- ...

---

## Cross-Cutting Technical Challenges

[Challenges that span multiple milestones — e.g. latency, model loading, Web Worker tradeoffs]
```

---

## Guidelines

- **Be concise** — each takeaway should be scannable in seconds
- **Prioritize actionable insights** — what would help the next person (or future you) understand quickly
- **Technical challenges** — include gotchas, performance considerations, library quirks, design tradeoffs
- **Skip empty sections** — if a milestone has no notable challenges, omit that subsection
- **Link to source** — reference plan/milestone paths for traceability

---

## Invocation

Attach this prompt and optionally the milestone path, then:

> Create takeaways from the milestones

Or:

> Generate TAKEAWAYS.md for milestones 01–04

Or (after implementation):

> Create takeaways for the milestones we just implemented, including technical challenges we hit
