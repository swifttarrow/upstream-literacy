# Task 004: Ingestion Notifications

## Goal

Notify moderators in the UI when ingestion jobs start, complete, complete with warnings, or fail per PRD §10.8.

## Deliverables

- [ ] In-UI notification when job starts (toast, banner, or bell)
- [ ] Notification when job completes (success)
- [ ] Notification when job completes with warnings
- [ ] Notification when job fails
- [ ] Notification when missing required data detected
- [ ] Clear, actionable messages (not overly technical)
- [ ] Optional: integrate with existing notifications system (m8) for consistency

## Notes

- PRD §10.8: job start, complete, complete with warnings, fail, missing required data
- MVP: in-UI only; email/notification center can be later
- May use existing notification infrastructure if available

## Verification

- Start batch job: start notification appears; on completion, success/warning/fail notification appears; messages understandable
