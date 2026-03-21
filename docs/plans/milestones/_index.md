# Milestones: District Community Matching Platform

**Source plan:** [Implementation Plan](../../implementation-plan.md)

## Milestone Order

| # | Milestone | Status |
|---|-----------|--------|
| 1 | [m1-foundation-project-setup-db-auth](./m1-foundation-project-setup-db-auth/) | Pending |
| 2 | [m2-user-profiles-districts-taxonomy](./m2-user-profiles-districts-taxonomy/) | Pending |
| 3 | [m3-district-data-ingestion-admin-overrides](./m3-district-data-ingestion-admin-overrides/) | Pending |
| 4 | [m4-discovery-matching-connections](./m4-discovery-matching-connections/) | Pending |
| 5 | [m5-conversations-realtime-messaging](./m5-conversations-realtime-messaging/) | Pending |
| 6 | [m6-groups-participant-management](./m6-groups-participant-management/) | Pending |
| 7 | [m7-moderation-reports-review-suspension](./m7-moderation-reports-review-suspension/) | Pending |
| 8 | [m8-notifications](./m8-notifications/) | Pending |
| 9 | [m9-ai-features-user-scoped](./m9-ai-features-user-scoped/) | Pending |
| 10 | [m10-frontend-polish](./m10-frontend-polish/) | Pending |
| 11 | [m11-ingestion-console-foundation](./m11-ingestion-console-foundation/) | Complete |
| 12 | [m12-ingestion-dashboard-candidates](./m12-ingestion-dashboard-candidates/) | Complete |
| 13 | [m13-ingestion-preview-and-ingest-flow](./m13-ingestion-preview-and-ingest-flow/) | Complete |
| 14 | [m14-ingestion-errors-and-data-quality](./m14-ingestion-errors-and-data-quality/) | Complete |
| 15 | [m15-ingestion-editing-and-audit](./m15-ingestion-editing-and-audit/) | Complete |

## Dependencies

```
m1 (Foundation)
  → m2 (Profiles, Districts, Taxonomy)
    → m3 (Ingestion)
      → m4 (Discovery, Matching, Connections)
        → m5 (Conversations, Messaging)
          → m6 (Groups) — can overlap with m5
        → m7 (Moderation)
        → m8 (Notifications)
        → m9 (AI) — can parallel with m8
  → m10 (Frontend) — can start after m2, iterate each phase

m3 (Ingestion)
  → m11 (Ingestion Console Foundation) — real NCES data, 100 districts
    → m12 (Ingestion Dashboard & Candidates UI)
      → m13 (Preview & Ingest Flow)
        → m14 (Errors & Data Quality)
          → m15 (Editing & Audit)
```

## Quick Links

- [Implementation Plan](../../implementation-plan.md)
- [PRD](../../prds/base.md)
- [District Data Ingestion PRD](../../prds/district-data-ingestion.md)
- [DB Schema](../../db-schema.md)
- [Developer Log](../../developer-log.md)
