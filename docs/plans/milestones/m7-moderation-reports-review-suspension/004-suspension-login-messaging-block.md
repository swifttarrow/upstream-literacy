# Task 004: Suspension — Login & Messaging Block

## Goal

Block login and messaging for suspended users. When suspended_until > now(), reject auth and message send.

## Deliverables

- [ ] Login: after credential check, if user.suspended_until > now(), return 403 with message
- [ ] Message send: before POST message, check sender suspended_until; 403 if suspended
- [ ] Conversation create: block if suspended
- [ ] Clear error message: "Account suspended until X"
- [ ] Optional: middleware to check suspension for protected routes

## Notes

- suspended_until NULL = not suspended
- Include suspended_until in error response for UI display

## Verification

```bash
# Suspend user; attempt login: 403
# Suspend user; attempt send message: 403
```
