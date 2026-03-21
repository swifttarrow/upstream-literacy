# Validation Report: M11–M15 Ingestion Console (District Data Ingestion)

**Validated:** 2025-03-21  
**Source:** [validate.md](../../agent/prompts/validate.md)

---

## Implementation Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M11** Ingestion Console Foundation | ✓ Fully implemented | Seed, schema, API, RBAC |
| **M12** Ingestion Dashboard & Candidates UI | ✓ Fully implemented | Dashboard, table, filters, actions |
| **M13** Preview & Ingest Flow | ✓ Fully implemented | Preview, trigger, progress, async |
| **M14** Errors & Data Quality | ✓ Fully implemented | Error capture, retry, missing data, notifications |
| **M15** Editing & Audit | ✓ Fully implemented | Edit API, revert, audit, re-ingest |

---

## Automated Verification Results

| Check | Result |
|-------|--------|
| **Build (backend)** | ✓ `npm run backend:build` |
| **Build (frontend)** | ✓ `npm run frontend:build` |
| **Tests** | ✓ `npm run test` (9 passed, 1 skipped) |
| **Lint** | ⚠️ Warnings (see below) |

### Lint Warnings

React Hook `useEffect` missing dependencies in:

- `frontend/src/app/admin/ingestion/page.tsx` — `loadData`, `router`
- `frontend/src/app/admin/ingestion/candidates/[id]/page.tsx` — `loadPreview`, `router`
- `frontend/src/app/admin/ingestion/jobs/[jobId]/page.tsx` — `loadJob`, `router`
- `frontend/src/app/admin/ingestion/districts/[districtId]/edit/page.tsx` — `loadDistrict`, `router`

*(Similar warnings exist in other non-ingestion pages.)*

---

## Code Review

### Matches Plan

**M11 – Foundation**
- ✓ 100-district seed with NCES IDs (`district-candidates.json`, 100 entries)
- ✓ Schema: `district_candidates`, `district_ingestion_jobs`, `district_ingestion_job_records`, `district_ingestion_errors`
- ✓ District candidate API with filters (search, state, status), pagination
- ✓ Ingestion job model with create/start/finalize flow
- ✓ RBAC: `requireModerator` on ingestion endpoints; `requireAdmin` on audit query

**M12 – Dashboard UI**
- ✓ Summary cards (Not Ingested, Ingested, Warnings, Failed, In Progress, Total)
- ✓ Recent jobs panel with links to job detail
- ✓ Filter bar (search, state, status)
- ✓ Candidate table: District, State, NCES ID, Status, Data (missing indicator), Last Refresh
- ✓ Ingest Selected, View Failed, View Warnings
- ✓ Link to district preview from each row

**M13 – Preview & Ingest**
- ✓ Preview API: source vs normalized, quality (ready/warning/blocked), missing fields, existing attributes
- ✓ Ingest trigger API with batch confirmation (>10 requires `confirm: true`)
- ✓ Duplicate active ingestion prevented (409 if district in_progress)
- ✓ Progress endpoint (`GET /admin/ingestion/jobs/:jobId`) with records
- ✓ Async processing (fire-and-forget `processIngestionJobAsync`); UI polls job status

**M14 – Errors & Data Quality**
- ✓ Errors persisted to `district_ingestion_errors` (job_id, candidate_id, error_type, message, retry_eligible)
- ✓ Data quality: REQUIRED_FIELDS (name, state, nces_district_id), RECOMMENDED_FIELDS (district_type) → ready/warning/blocked
- ✓ Retry API: retry eligible failed records from job
- ✓ Job notifications via `createNotification` on completion (completed, completed_with_warnings, failed, partially_failed)
- ✓ Error display on job detail (error_message, retry_eligible, warning_details)

**M15 – Editing & Audit**
- ✓ PATCH `/admin/ingestion/districts/:districtId` for overrides (district_effective_attribute_values, provenance)
- ✓ DELETE revert override (restore from `district_ingestion_events` or delete if no ingest)
- ✓ Audit: `ingestion_preview_viewed`, `ingestion_started`, `ingestion_retried`, `district_edited`, `override_reverted`
- ✓ Audit query: `GET /admin/ingestion/audit` (admin-only)
- ✓ Re-ingest: preview shows existing attributes; ingest button allows re-run; `district_ingestion_events` appended

### Deviations

1. **Batch processing: in-process vs pg-boss**  
   Plan (M13.005) suggests pg-boss for durability; implementation uses in-process async. Jobs are lost on server restart. Acceptable for MVP; consider pg-boss for production.

2. **Re-ingestion diff preview**  
   M15.004: "Preview shows current vs incoming preview version (diff or side-by-side)." Current preview shows existing attributes table but not an explicit diff against incoming. The preview API returns both; UI could be enhanced with side-by-side diff.

3. **Batch/ingest-all confirmation modal**  
   Plan mentions "Confirmation required for batch and ingest-all." Implementation requires `confirm: true` in the request body for batches >10; no explicit modal in UI for ingest-all (only Ingest Selected exists).

### Potential Issues

1. **No ingestion-specific tests**  
   Backend has no tests for ingestion routes. Add tests for: candidates API, preview, trigger, retry, edit, revert, audit.

2. **Districts route `city` column**  
   `GET /districts` filters by `d.city`; schema has `city`; ingestion does not populate it. Non-blocking.

3. **Edit page `value_number` handling**  
   PATCH sends `value_text`; edit form uses text inputs. Attributes like `frl_pct`, `el_pct` are numeric — ensure correct serialization if editing those.

---

## Manual Testing Required

- [ ] Run `npm run migrate` and `npm run seed:all` (or `seed:attributes` + `seed-district-candidates`)
- [ ] Log in as moderator (or admin)
- [ ] Visit `/admin/ingestion` — dashboard loads, summary counts, recent jobs
- [ ] Search districts by name; filter by state and status
- [ ] Click Preview on a candidate — source, normalized, quality banner, missing fields
- [ ] Ingest single district — redirect to job, progress updates
- [ ] Ingest selected (batch) — confirmation if >10; job processes
- [ ] On failed record: view error, use Retry All Eligible
- [ ] Edit ingested district — change field, save; verify override provenance
- [ ] Revert override — verify value restored to source
- [ ] Re-ingest district — new job, history preserved
- [ ] Log in as non-moderator — ingestion routes return 403
- [ ] Audit: as admin, `GET /admin/ingestion/audit` returns entries

---

## Recommendations

1. **Fix useEffect deps** — Add `loadData`/`loadPreview`/`loadJob`/`loadDistrict` to deps or wrap in `useCallback` to satisfy `react-hooks/exhaustive-deps`.
2. **Add ingestion API tests** — Cover candidates, summary, preview, trigger, retry, edit, revert, audit.
3. **Consider pg-boss** — For production, use job queue so ingestion survives restarts.
4. **Enhance re-ingest preview** — Add side-by-side diff of current vs incoming values.
5. **Commit and PR** — Implementation is in uncommitted files; create branch, incremental commits, and PR per project workflow.

---

## Checklist (from validate.md)

- [x] All phases marked complete are actually done
- [x] Automated tests pass (existing tests; no ingestion-specific tests)
- [x] Code follows existing patterns (Zod, auth, transactions)
- [ ] No regressions — manual verification recommended
- [x] Error handling is robust (try/catch, persisted errors, retry logic)
