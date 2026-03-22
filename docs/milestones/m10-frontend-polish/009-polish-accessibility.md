# Task 009: Polish & Accessibility

## Goal

Add loading states, error handling, accessibility improvements, and performance polish across the app.

## Deliverables

- [ ] Loading states: skeletons or spinners for lists, forms, async actions
- [ ] Error handling: API errors display user-friendly messages; retry where appropriate
- [ ] 403/401: clear messaging; redirect to login when session expired
- [ ] Accessibility: semantic HTML, aria-labels, keyboard nav, focus management
- [ ] Responsive: usable on tablet/desktop (mobile optional for MVP)
- [ ] Performance: lazy load routes if needed; optimize images
- [ ] E2E test for critical path (optional): signup → profile → discover → connect → message

## Notes

- NFR: fast onboarding, clear match explanations

## Verification

- Tab through flows; no keyboard traps
- Slow network; loading states appear
- API error; user sees helpful message
