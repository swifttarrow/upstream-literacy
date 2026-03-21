# Task 004: Background Batch (Optional)

## Goal

Optional pg-boss job to batch-create notifications for offline users (e.g. when message sent and recipient not connected). Ensures notifications not missed.

## Deliverables

- [ ] If pg-boss configured: job that processes pending notification events
- [ ] Alternative: create notifications synchronously on message send; websocket push is best-effort
- [ ] Document approach: sync create + ws push vs async batch
- [ ] If batch: idempotent; don't duplicate notifications
- [ ] Skip if M8.001 already creates synchronously (simpler MVP)

## Notes

- Plan says "optional job"; sync create in M8.001 may suffice
- pg-boss per technical decisions

## Verification

- If implemented: offline user receives notification on next GET /notifications
