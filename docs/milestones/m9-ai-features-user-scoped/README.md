# Milestone 9: AI Features (User-Scoped)

## Overview

User-scoped AI: conversation summarization and suggested next steps. Only operates on conversations the user participates in. Store artifacts in `user_ai_artifacts`.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-9-ai-features-user-scoped)

## Dependencies

- [x] Milestone 5 (Conversations & Real-Time Messaging)

## Changes Required

| Area | Changes |
|------|---------|
| **Summarization** | POST /conversations/:id/summarize; call LLM with user-visible messages; store in user_ai_artifacts |
| **Suggested actions** | POST /conversations/:id/suggest-actions; store in user_ai_artifacts |
| **Retrieval** | GET /conversations/:id/ai-artifacts (user-scoped; verify participation) |
| **LLM** | Integrate Anthropic claude-sonnet-4-6; prompt versioning in artifact metadata |
| **Rate limiting** | 5/hour per user per endpoint |
| **Scope** | Enforce: requester must be participant |

## Success Criteria

### Automated Verification

- [x] AI endpoints enforce participation check
- [x] Artifacts stored with correct user_id, conversation_id, kind
- [x] Non-participant receives 403

### Manual Verification

- [x] User can request summary of their conversation
- [x] User receives suggested next steps
- [x] Artifacts persist and display correctly

## Tasks

- [001-summarize-endpoint](./001-summarize-endpoint.md)
- [002-suggest-actions-endpoint](./002-suggest-actions-endpoint.md)
- [003-ai-artifacts-retrieval](./003-ai-artifacts-retrieval.md)
- [004-llm-integration-rate-limit](./004-llm-integration-rate-limit.md)
