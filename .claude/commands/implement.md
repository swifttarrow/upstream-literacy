---
description: Implement a milestone from docs/milestones
---

# Implement

Implement a milestone from `docs/milestones/`. Execute all tasks in order with verification.

## Usage

```
implement 01-project-setup-webrtc
implement 02-face-detection-gaze
```

If no milestone provided, ask for one. List milestones in `docs/milestones/_index.md`.

## Getting Started

1. Resolve the milestone: `docs/milestones/{id}-{name}/` → read `README.md`, enumerate tasks from `tasks/`
2. Read each task file to implement
3. Create a todo list to track progress
4. Start implementing when you understand the work

## Implementation Philosophy

- Follow the plan's intent while adapting to reality
- Implement each task fully before moving to the next
- Update checkboxes in task files and milestone README as you complete them
- When things don't match, STOP and explain clearly

## Verification

After each task:
1. Run automated success criteria from the task or milestone
2. Fix issues before proceeding
3. Update plan checkboxes
4. Inform human that manual verification is ready (if any)
5. Wait for confirmation before next task (unless instructed to run multiple tasks)

```
Task [nnn] Complete – Ready for Manual Verification

Automated verification passed:
- [List checks that passed]

Please perform manual verification from the plan:
- [List manual steps]

Let me know when complete so I can proceed to the next task.
```

If instructed to run multiple tasks consecutively, skip the pause until the last task.

Do not check off manual verification items until confirmed by the user.

## On Mismatch

If reality doesn't match the plan:
- STOP and explain the discrepancy
- Present: Expected vs Found vs Why it matters
- Ask how to proceed before deviating

```
Issue in Task [nnn]:
Expected: [what the plan says]
Found: [actual situation]
Why this matters: [explanation]

How should I proceed?
```

## Resuming

If the milestone or task has existing checkmarks, trust completed work and pick up from the first unchecked item.
