# Milestone 4: Discovery, Matching & Connections

## Overview

Implement discovery API (suggested connections) and LinkedIn-style connections: filter by problem, district attributes, role, geography; rank results; label exact vs close match; user can send connection requests to any discovered peer; accept/reject flow. No messaging yet—discovery and connection establishment only.

**Source:** [Implementation Plan](../../../implementation-plan.md#phase-4-discovery-matching--connections)

## Dependencies

- [ ] Milestone 3 (District Data Ingestion & Admin Overrides)

## Changes Required

| Area | Changes |
|------|---------|
| **Schema** | `user_connections` table exists (schema/06b); verify migration includes it |
| **Matching** | `GET /discovery/matches` with query params: problemId, districtFilters, professionalRole, stateRegion, etc. |
| **Filtering** | DB-level filters; exclude suspended, non-approved |
| **Ranking** | App-layer heuristic: primary problem match > secondary > district similarity; deterministic, explainable |
| **Response** | List with matchType (exact \| close), explanation, connectionStatus (none \| pending_sent \| pending_received \| connected) |
| **Connections** | POST /connections/requests, accept, reject; GET /connections (list) |
| **Cold start** | Broaden criteria when scarce; include is_demo_profile when configured |
| **Performance** | Indexes; target < 2s per request |

## Success Criteria

### Automated Verification

- [ ] Matching returns only approved, non-suspended users with profile completed
- [ ] Filters reduce result set as expected
- [ ] Match explanations and connectionStatus present and coherent
- [ ] Connection request creates pending row; accept/reject updates status
- [ ] Cannot send duplicate request; cannot connect with self
- [ ] Query latency < 2s under test load

### Manual Verification

- [ ] User can discover peers by problem and district filters
- [ ] User can send connection request; recipient sees pending; accept creates connection
- [ ] Exact vs close matches labeled correctly
- [ ] Cold-start behavior shows close matches when exact limited

## Tasks

- [001-verify-user-connections-schema](./001-verify-user-connections-schema.md)
- [002-discovery-matches-api](./002-discovery-matches-api.md)
- [003-matching-ranking-logic](./003-matching-ranking-logic.md)
- [004-connections-crud-api](./004-connections-crud-api.md)
- [005-indexes-performance](./005-indexes-performance.md)
