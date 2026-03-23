# Upstream Literacy — District Community Platform

Upstream Literacy helps school district staff discover peers with similar challenges, connect, and collaborate through structured matching and real-time messaging.

## Production

- Live app: [https://upstream-literacy.up.railway.app/](https://upstream-literacy.up.railway.app/)

## What was built

The project implements the full MVP scope across foundation, data, collaboration, and moderation:

- Authentication and profile onboarding with role-based access
- District data ingestion console (NCES upload, normalization, missing-data flagging, editing, audit)
- Problem taxonomy management, discovery, and ranked matching with explanations
- Connection requests, direct messaging, and small-group conversations
- Notifications, moderation workflows, and user-scoped AI features
- District map visualization for ingestion/admin workflows

## Useful docs (in `~/docs` for this project)

- Product requirements: [docs/prds/base.md](./docs/prds/base.md)
- Ingestion PRD: [docs/prds/district-data-ingestion.md](./docs/prds/district-data-ingestion.md)
- Visualization PRD: [docs/prds/district-data-visualization.md](./docs/prds/district-data-visualization.md)
- Implementation plan: [docs/implementation-plan.md](./docs/implementation-plan.md)
- Milestones index: [docs/milestones/_index.md](./docs/milestones/_index.md)
- Database schema guide: [docs/db-schema.md](./docs/db-schema.md)
- Developer decisions log: [docs/developer-log.md](./docs/developer-log.md)
