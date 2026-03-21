# Spec — School District Data Ingestion Console

## 1. Overview

Build an internal moderator-facing data ingestion console that allows moderators to upload NCES district data, automatically ingest all districts from the uploaded file, and edit district data when needed. The system provides a small upload UI; after upload, the system ingests all district records and scores each district's completeness. Moderators do not manually ingest individual districts—they only edit data when they want to correct or enrich it.

The ingestion experience should be transparent and operationally safe:
- moderators can upload the latest NCES CCD data (CSV) via a simple UI
- the system automatically ingests all districts from the uploaded file
- the system scores each district's data completeness
- moderators can browse districts and view completeness scores
- moderators can edit district data when they want to correct or enrich it
- moderators can detect and resolve missing or invalid data

---

## 2. Problem

The platform depends on high-confidence district data to support matching and discovery. Relying on hidden backend imports or one-off scripts makes it difficult for moderators to:
- understand what data is being added
- validate quality before publishing
- correct errors
- identify missing fields
- safely expand the dataset over time

An internal ingestion UI is needed so moderators can manage district data with confidence and visibility.

---

## 3. Goals

- Allow moderators to upload NCES CCD district data (CSV) through a simple UI
- Automatically ingest all districts from the uploaded file
- Score each district's data completeness (required vs optional fields)
- Allow moderators to browse ingested districts and view completeness scores
- Allow moderators to edit district data when they want to correct or enrich it
- Surface errors and missing data during upload/ingestion
- Create an auditable workflow for district data operations

---

## 4. Non-Goals (MVP)

- Real-time sync with NCES (upload is manual/on-demand)
- Public user-facing editing of district records
- Bulk ingestion from arbitrary third-party CSVs (NCES CCD format only)
- AI-assisted data cleansing
- Complex merge/deduplication across multiple external sources

---

## 5. Users

### Primary User
- Moderator / internal operations user

### Secondary User
- Admin (may have broader permissions than moderators)

---

## 6. Key User Stories

### Moderator
- As a moderator, I want to upload the latest NCES CCD data file so I can keep district data current.
- As a moderator, I want the system to automatically ingest all districts from my upload so I do not need to select each one.
- As a moderator, I want to see each district's completeness score so I know which records need attention.
- As a moderator, I want to browse ingested districts and filter by completeness, state, or search so I can find specific records.
- As a moderator, I want to edit district data when I need to correct or enrich it.
- As a moderator, I want to see errors and missing fields from the upload/ingestion so I can fix or follow up on bad data.
- As a moderator, I want an audit trail of upload and edit actions so changes are accountable.

### Admin
- As an admin, I want to review data quality and completeness outcomes at scale.

---

## 7. Scope

### In Scope
- Internal moderator UI for district data management
- NCES CCD file upload (CSV format supported by NCES)
- Automatic ingestion of all districts from uploaded file
- Completeness scoring for each district (required vs optional fields)
- District list/dashboard with filters (search, state, completeness)
- Post-ingestion editing (moderators edit only when they want)
- Error reporting for upload/parse/ingestion failures
- Missing data flagging and completeness indicators
- Audit logging

### Out of Scope
- User-facing district editing
- Automated recurring NCES sync (upload is manual/on-demand)
- Bulk ingestion from arbitrary third-party CSV formats
- External data-source switching in MVP

---

## 8. Source Data Assumptions

The ingestion workflow will use **NCES Common Core of Data (CCD)** district files as the source of truth. Moderators upload the latest CCD CSV (or equivalent format) via the UI.

### NCES CCD file format
NCES provides CCD district data in CSV format. The system shall accept the standard CCD district file structure (directory, universe, or similar). The upload UI will guide moderators to download the appropriate file from nces.ed.gov/ccd and upload it.

### Example data fields expected from source or normalization layer
- District name
- State
- NCES district identifier
- District type / locale classification
- Enrollment
- Enrollment bucket
- Free/reduced lunch indicator or proxy
- FRL bucket
- English learner / multilingual learner indicator or proxy
- EL bucket
- Grade bands served
- Source name
- Source record URL or identifier
- Source timestamp / last-updated date
- Import timestamp

If some fields are not available directly from NCES, the system may store them as:
- missing
- derived
- admin-entered override

---

## 9. Product Principles

- **Transparency over magic**: moderators should always know what data is being imported.
- **Human-in-the-loop**: moderators can review, correct, and approve.
- **Trustworthy defaults**: source metadata and timestamps should be visible.
- **Operational clarity**: ingestion should expose progress, warnings, and failures clearly.
- **Editable after import**: ingestion is not a one-shot irreversible process.

---

## 10. Functional Requirements

## 10.1 NCES Data Upload UI

The system shall provide a small upload UI for NCES CCD district data.

The upload UI shall:
- accept CSV files in NCES CCD district format
- validate file format and structure before processing
- show upload progress and file size
- link to or describe where to download the latest CCD data from nces.ed.gov

When a valid file is uploaded, the system shall:
- parse the CSV
- automatically ingest all district records
- score completeness for each district
- create an ingestion job record for the upload
- surface parse/validation errors if the file format is unexpected

---

## 10.2 Ingestion Dashboard

The system shall provide an internal moderator-facing ingestion dashboard.

The dashboard shall show:
- upload area or link to upload new NCES data
- total districts ingested (from most recent upload)
- completeness summary (e.g., fully complete, partial, incomplete counts)
- most recent upload/ingestion jobs
- quick access to districts with low completeness or errors

The dashboard shall support:
- search by district name
- filter by state
- filter by completeness level
- filter by warning/error state

---

## 10.3 District List

The system shall display ingested districts with completeness scores.

Each row should show:
- district name
- state
- NCES identifier
- completeness score or tier (e.g., full, partial, minimal)
- missing data indicator (which key fields are absent)
- last source refresh timestamp (from upload)

The moderator shall be able to:
- click into a district record to view details and edit
- filter and search to find districts needing attention

---

## 10.4 District Detail (View & Edit)

The system shall provide a district detail screen for viewing and editing.

The detail screen shall show:
- raw source values (read-only)
- normalized app values
- field-level missing value indicators
- completeness score
- source metadata

The moderator shall be able to:
- edit allowed fields (normalized values, overrides)
- revert overrides to source-backed values
- save changes with validation

---

## 10.5 Upload & Ingestion Progress

The system shall display progress during upload and automatic ingestion.

For each upload/ingestion job, the UI shall show:
- total records in file
- records completed
- records remaining
- records succeeded
- records succeeded with warnings
- records failed
- current active record (if processing)
- started at timestamp
- elapsed time

The UI should provide:
- progress bar
- per-record status updates (for large uploads)
- live or near-live refresh
- final job summary

The system may support:
- background processing for large uploads
- retry failed records from the same job

---

## 10.6 Error Capture

The system shall capture and display upload and ingestion errors.

Error types may include:
- file parse failure (invalid CSV format)
- source record not found
- NCES identifier mismatch
- validation failure
- duplicate district conflict
- required field missing
- normalization failure
- database write failure

Each error entry shall include:
- district name (if applicable)
- district identifier
- error type
- human-readable error message
- timestamp
- job id
- retry eligibility (where applicable)

The moderator shall be able to:
- inspect error details
- retry eligible failures
- manually correct via district edit and re-upload if needed

---

## 10.7 Completeness Scoring

The system shall automatically score each district's data completeness after ingestion.

The completeness score shall reflect:
- required fields present (district name, state, source identifier, matching anchors)
- recommended fields present (district type, enrollment bucket, FRL bucket, EL bucket, grade bands)
- optional fields present

Completeness tiers (e.g., full, partial, minimal) shall be computed per district and displayed in the district list and detail screens.

The system shall identify missing data at:
- field level
- record level
- job summary level

Examples of fields to factor into completeness:
- district type / locale
- enrollment or enrollment bucket
- FRL bucket
- EL bucket
- grade bands
- source timestamp

The UI shall surface:
- completeness score per district
- which key fields are missing for low-scoring districts
- summary counts (e.g., fully complete, partial, minimal) on the dashboard

Possible completeness/warning states:
- Missing Optional Data
- Missing Required Matching Data
- Derived Value Used
- Source Metadata Incomplete

---

## 10.8 Notifications and Alerts

The system shall notify the moderator in the UI when:
- an upload/ingestion job starts
- an upload/ingestion job completes
- an upload/ingestion job completes with warnings
- an upload/ingestion job fails
- missing required data or low completeness is detected

The system may later support:
- email notifications for long-running upload jobs
- notification center integration

---

## 10.9 Post-Ingestion Editing

The system shall allow moderators to edit district data after ingestion.

Editable fields should include:
- normalized district type
- enrollment bucket
- FRL bucket
- EL bucket
- grade bands
- display name
- notes
- internal status flags

The system should preserve:
- original source values
- edit timestamp
- editor identity
- reason for change if provided

The UI shall clearly distinguish:
- source-backed data
- normalized system values
- moderator overrides

The system should support:
- reverting an override to source-backed value
- saving partial edits
- validation on edit save

---

## 10.10 Audit Logging

The system shall maintain an audit log for district data operations.

Audited actions shall include:
- file uploaded
- upload/ingestion started
- upload/ingestion completed
- upload/ingestion retried
- district edited
- override applied
- override reverted

Audit records should include:
- actor
- action type
- district id
- job id if applicable
- before/after values where relevant
- timestamp

---

## 10.11 Re-Upload / Refresh

The system should allow moderators to upload a new NCES file to refresh district data.

Possible use cases:
- NCES released updated CCD data
- previous upload had errors or missing fields
- normalization rules were updated

The system shall:
- accept a new upload at any time
- merge or overwrite per configurable policy (e.g., overwrite by NCES id)
- warn before overwriting districts that have moderator overrides
- preserve historical ingestion/upload records

---

## 11. UX / Screen-Level Spec

## 11.1 Ingestion Dashboard
Primary screen for moderator operations.

### Key UI components
- upload area (drag-and-drop or file picker for NCES CCD CSV)
- link to NCES CCD download page
- top summary cards
  - Total Districts
  - Fully Complete
  - Partial
  - Incomplete / Warnings
- district table (with completeness scores)
- filter bar (search, state, completeness)
- recent upload/jobs panel
- CTA buttons:
  - Upload New NCES Data
  - Retry Failed (if applicable)
  - View Low-Completeness Districts

---

## 11.2 District Detail Screen (View & Edit)

### Sections
- header
  - district name
  - state
  - NCES id
  - completeness score
- source data card (read-only)
- normalized data card (editable)
- missing fields / completeness breakdown
- source metadata card
- action bar
  - Edit
  - Save
  - Revert Override

---

## 11.3 Upload / Ingestion Job Detail Screen

### Sections
- job summary (file name, uploaded at)
- progress bar
- live record list (for large uploads)
- succeeded / warning / failed tabs
- retry failed button
- completion summary with completeness breakdown

---

## 11.4 District Edit Screen

### Sections
- source values (read-only)
- editable normalized values
- override reason field
- validation messages
- save / revert controls

---

## 12. Data Quality Rules

The system should classify fields into:

### Required for ingestion
- district name
- state
- source identifier
- at least one valid district matching anchor

### Required for matching readiness
- district type or equivalent locale bucket
- enrollment bucket
- at least one problem-independent district context field

### Optional but recommended
- FRL bucket
- EL bucket
- grade bands
- source last updated

### Data-quality outcomes
- **Ready**: all required fields present
- **Warning**: ingestible, but some recommended fields missing
- **Blocked**: required fields missing or invalid

---

## 13. Permissions

### Moderator
- view dashboard
- upload NCES CCD data
- view district list and completeness scores
- edit district data
- retry failed upload/ingestion
- view warnings/errors

### Admin
- all moderator permissions
- configure validation rules
- manage completeness scoring rules
- view all audit logs

---

## 14. Non-Functional Requirements

## 14.1 Performance
- Upload should accept files and begin processing promptly
- Parsing and ingestion should run asynchronously for large files (thousands of districts) without blocking the UI
- Progress updates should refresh frequently enough to reassure moderators during upload
- District list and detail should load quickly for browsing and editing

## 14.2 Security
- Ingestion console shall require authenticated internal access
- Role-based access shall restrict ingestion and edit capabilities
- Audit logs shall be retained for district data changes
- Source-backed data and overrides shall be clearly separated

## 14.3 Usability
- Moderators should be able to upload NCES data with minimal training
- Completeness scores and missing values should be immediately understandable
- Errors should be actionable and not overly technical
- Upload and ingestion progress should be visible and clear

## 14.4 Maintainability
- Ingestion logic should be modular and reusable
- Source mapping and normalization rules should be configurable
- Error categories should be standardized
- Data validation should be testable

## 14.5 Scalability
- System should support uploads with thousands of districts (full U.S. CCD)
- Upload/ingestion should remain stable as volume grows (async processing, progress tracking)
- The design should support additional sources later, even if NCES is the only MVP source

---

## 15. Backend / System Behavior

## 15.1 Ingestion Job Model
The system should create a job record for every ingestion run.

Suggested statuses:
- Queued
- Running
- Completed
- CompletedWithWarnings
- Failed
- PartiallyFailed

## 15.2 Record-Level Processing
Each district in a batch should have its own record-level status:
- Pending
- Running
- Succeeded
- SucceededWithWarnings
- Failed

## 15.3 Idempotency
The system should avoid duplicate district creation when the same district is ingested multiple times.

The system should use:
- NCES district identifier
- state + normalized district name
- internal district id mapping

## 15.4 Historical Preservation
The system should preserve:
- source snapshots
- ingestion job history
- override history
- edit history

---

## 16. Suggested District Fields (Post-Ingestion)

For each ingested district, the system should support:

- `district_name`
- `state`
- `nces_district_id`
- `district_type_raw`
- `district_type_normalized`
- `enrollment_raw`
- `enrollment_bucket`
- `frl_raw`
- `frl_bucket`
- `el_raw`
- `el_bucket`
- `grade_bands_raw`
- `grade_bands_normalized`
- `source_name`
- `source_record_reference`
- `source_last_updated_at`
- `ingested_at`
- `data_quality_status`
- `missing_fields`
- `warning_flags`
- `internal_notes`

---

## 17. Success Metrics

- % of uploaded districts successfully ingested
- % of ingested districts with full vs partial vs minimal completeness
- % of failed records retried successfully
- average time to process upload (by file size)
- number of moderator edits per ingested district
- reduction in low-completeness districts over time

---

## 18. Risks

- NCES data may not map perfectly to required app fields
- Some important fields may require derivation or manual normalization
- Moderators may not understand whether a warning is safe to ignore
- Re-ingestion may overwrite intended manual corrections if not handled carefully
- Source timestamps may vary in completeness

---

## 19. Open Questions

- Which CCD file variant (directory vs universe) and columns to support for MVP?
- How to handle duplicate NCES IDs across uploads (overwrite, merge, skip)?
- Should re-upload preserve moderator overrides automatically or prompt?
- Will the system store raw NCES records verbatim, or only transformed snapshots?
- Completeness tier thresholds (e.g., what counts as full vs partial vs minimal)?

---

## 20. Recommended MVP Decisions

- Use **NCES CCD CSV upload** as the district data input; no pre-seeded district list
- Accept standard CCD district file format; validate and parse on upload
- Allow:
  - upload NCES file → automatic ingestion of all districts
  - browse districts with completeness scores
  - edit districts when moderator wants to correct or enrich
- Compute completeness score automatically per district (required vs recommended vs optional fields)
- Treat missing matching-critical fields as completeness downgrade; surface in UI for editing
- Preserve source values separately from moderator overrides
- Make upload/ingestion asynchronous with visible progress and retry support