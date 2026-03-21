# Task 004: LLM Integration & Rate Limit

## Goal

Integrate LLM provider (OpenAI, Anthropic). Add rate limiting to AI endpoints. Support prompt versioning.

## Deliverables

- [ ] LLM client module: config from env (API key, model); call provider
- [ ] Abstract interface so provider can be swapped
- [ ] Rate limit: e.g. 10 summarize + 10 suggest-actions per user per hour
- [ ] Return 429 when rate limit exceeded
- [ ] Prompt version in artifact metadata (e.g. "v1")
- [ ] Document env vars (OPENAI_API_KEY or ANTHROPIC_API_KEY)

## Notes

- Use provider SDK (openai, @anthropic-ai/sdk)
- Rate limit: in-memory or Redis; per-user key
- Plan: "can be phased later" — can stub LLM for initial integration

## Verification

```bash
# Under rate limit: 200
# Over rate limit: 429
```
