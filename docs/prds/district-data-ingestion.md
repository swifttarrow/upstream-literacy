# Spec — School District Data Ingestion Console

## 1. Overview

Build an internal moderator-facing data ingestion console that allows moderators to upload NCES district data, automatically ingest all districts from the uploaded file, and edit district data when needed. The system provides a small upload UI; after upload, the system ingests all district records. Moderators do not manually ingest individual districts—they only edit data when they want to correct or enrich it.

The ingestion experience should be transparent and operationally safe:
- moderators upload **both** the NCES CCD district file and the EDGE Public LEA Geocode file via a simple UI
- the system automatically ingests all districts from the CCD file and enriches them with coordinates from the EDGE file
- moderators can browse districts and filter by NCES year when multiple years have been uploaded
- moderators can edit district data when they want to correct or enrich it
- moderators can identify districts that have missing data

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
- Allow moderators to browse ingested districts and select/filter by NCES year when multiple years have been uploaded
- Allow moderators to edit district data when they want to correct or enrich it
- Flag districts that have missing data
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
- As a moderator, I want to upload the latest NCES CCD and EDGE geocode files so I can keep district data current with coordinates.
- As a moderator, I want the system to automatically ingest all districts from my upload so I do not need to select each one.
- As a moderator, I want to select a given NCES year when I've uploaded data across multiple years so I can view the right dataset.
- As a moderator, I want to browse ingested districts and filter by state or search so I can find specific records.
- As a moderator, I want to edit district data when I need to correct or enrich it.
- As a moderator, I want to see which districts have missing data so I can fix or follow up on them.
- As a moderator, I want an audit trail of upload and edit actions so changes are accountable.

### Admin
- As an admin, I want to review data quality outcomes at scale.

---

## 7. Scope

### In Scope
- Internal moderator UI for district data management
- Dual file upload: NCES CCD district file (CSV) + EDGE Public LEA Geocode file (CSV from ZIP)
- Automatic ingestion of all districts from CCD file, joined with coordinates from EDGE file by LEAID
- District list/dashboard with filters (search, state, NCES year)
- NCES year selector for when data has been uploaded across multiple years
- Post-ingestion editing (moderators edit only when they want)
- Error reporting for upload/parse/ingestion failures
- Missing data flagging for districts
- Audit logging

### Out of Scope
- User-facing district editing
- Automated recurring NCES sync (upload is manual/on-demand)
- Bulk ingestion from arbitrary third-party CSV formats
- External data-source switching in MVP

---

## 8. Source Data Assumptions

The ingestion workflow requires **two files** uploaded together:

1. **NCES CCD district file** — administrative data (name, state, NCES id, district metadata)
2. **NCES EDGE Public LEA Geocode file** — latitude/longitude coordinates and locale

Moderators upload both files via the UI. The system joins them by LEAID (NCES district identifier) during ingestion.

### 8.1 NCES CCD district file
NCES provides CCD district data in CSV format. The system shall accept the standard CCD LEA directory file structure. Download from: [CCD Data Files](https://nces.ed.gov/ccd/files.asp) — select the LEA (Local Education Agency) level and the appropriate school year. The upload UI will link to this page.

### 8.2 NCES EDGE Public LEA Geocode file
NCES EDGE provides district-level latitude/longitude coordinates. Download from: [EDGE School Geocodes & Geoassignments](https://nces.ed.gov/programs/edge/geographic/schoollocations) — select "Public School District File". The ZIP contains a CSV; the system shall accept the extracted CSV. Select the school year that matches the CCD file.

### Example data fields expected from source or normalization layer
- District name
- State
- NCES district identifier
- NCES year (school year from CCD file; used when selecting across multiple upload years)
- District size (enrollment-based: Small &lt;2,500, Medium 2,500–10K, Large 10K–25K, XL 25K+; unknown when enrollment is missing)
- Enrollment
- Enrollment bucket
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

The system shall provide an upload UI that requires **both** files.

The upload UI shall:
- accept **two** files: (1) CCD district CSV, (2) EDGE Public LEA Geocode CSV (extracted from ZIP)
- require both files before allowing upload; clearly label each (e.g., "CCD District File", "EDGE Geocode File")
- validate file format and structure for both (expected columns, encoding)
- show upload progress and file sizes
- link to download pages for both sources:
  - [CCD Data Files](https://nces.ed.gov/ccd/files.asp) — LEA level
  - [EDGE School Geocodes](https://nces.ed.gov/programs/edge/geographic/schoollocations) — Public School District File

When both valid files are uploaded, the system shall:
- parse both CSVs
- join CCD and EDGE data by LEAID
- automatically ingest all district records with coordinates from EDGE where matched
- create an ingestion job record for the upload
- surface parse/validation errors if either file format is unexpected

---

## 10.2 Ingestion Dashboard

The system shall provide an internal moderator-facing ingestion dashboard.

The dashboard shall show:
- upload area or link to upload new NCES data
- total districts ingested (scoped to selected NCES year when applicable)
- NCES year selector (when data has been uploaded across multiple years)
- most recent upload/ingestion jobs
- quick access to districts with missing data

The dashboard shall support:
- search by district name
- filter by state
- select NCES year (when multiple years have been uploaded)
- filter by missing-data flag

---

## 10.3 District List

The system shall display ingested districts, optionally scoped by selected NCES year when multiple years have been uploaded.

Each row should show:
- district name
- state
- NCES identifier
- NCES year (when multiple years exist)
- missing data flag (indicates district has missing data)
- last source refresh timestamp (from upload)

The moderator shall be able to:
- click into a district record to view details and edit
- filter and search to find districts
- select a given NCES year to view districts from that year

---

## 10.4 District Detail (View & Edit)

The system shall provide a district detail screen for viewing and editing.

The detail screen shall show:
- raw source values (read-only)
- normalized app values
- field-level missing value indicators (for districts with missing data)
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

## 10.6 Error Capture and Missing Data Flagging

The system shall capture upload/ingestion errors and flag districts with missing data.

**Upload/ingestion errors** (blocking or recoverable):
- file parse failure (invalid CSV format)
- database write failure

**Missing data flagging**: Districts that have missing data (any required or recommended fields absent per Data Quality Rules) shall be flagged. The moderator shall be able to:
- see which districts are flagged as having missing data
- filter the district list to show only districts with missing data
- click into a district to see which fields are missing
- edit districts to correct or add missing data

Each error entry shall include:
- district name (if applicable)
- district identifier
- error type
- human-readable error message
- timestamp
- job id

The moderator shall be able to:
- inspect error details
- manually correct via district edit and re-upload if needed

---

## 10.7 NCES Year Selection

When moderators have uploaded NCES data across multiple years, the system shall allow selecting a given NCES year to view and filter districts.

The NCES year selector shall:
- appear on the dashboard and district list when multiple years of data exist
- scope the displayed district count and list to the selected year
- persist or default to the most recent year
- be clearly labeled (e.g., "NCES Year" or "School Year") to distinguish from calendar year

---

## 10.8 Notifications and Alerts

The system shall notify the moderator in the UI when:
- an upload/ingestion job starts
- an upload/ingestion job completes
- an upload/ingestion job completes with warnings
- an upload/ingestion job fails
- districts with missing data are ingested

The system may later support:
- email notifications for long-running upload jobs
- notification center integration

---

## 10.9 Post-Ingestion Editing

The system shall allow moderators to edit district data after ingestion.

Editable fields should include:
- normalized district type
- enrollment bucket
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
- accept a new dual upload (CCD + EDGE) at any time
- merge or overwrite per configurable policy (e.g., overwrite by NCES id)
- warn before overwriting districts that have moderator overrides
- preserve historical ingestion/upload records

---

## 11. UX / Screen-Level Spec

## 11.1 Ingestion Dashboard
Primary screen for moderator operations.

### Key UI components
- upload area: two required file inputs (CCD district CSV, EDGE geocode CSV)
- links to CCD and EDGE download pages
- NCES year selector (when multiple years have been uploaded)
- top summary cards
  - Total Districts (for selected year)
  - Districts with Missing Data
- district table (with missing-data flag)
- filter bar (search, state, NCES year, missing-data)
- recent upload/jobs panel
- CTA buttons:
  - Upload New NCES Data
  - View Districts with Missing Data

---

## 11.2 District Detail Screen (View & Edit)

### Sections
- header
  - district name
  - state
  - NCES id
  - NCES year (when applicable)
  - missing data indicator (if applicable)
- source data card (read-only)
- normalized data card (editable)
- missing fields (for districts with missing data)
- source metadata card
- action bar
  - Edit
  - Save
  - Revert Override

---

## 11.3 Upload / Ingestion Job Detail Screen

### Sections
- job summary (file name, uploaded at, NCES year)
- progress bar
- live record list (for large uploads)
- succeeded / warning / failed tabs
- completion summary (including count of districts with missing data)

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
- district size (enrollment-based: small/medium/large/xl; unknown when enrollment missing)
- enrollment bucket
- at least one problem-independent district context field

### Optional but recommended
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
- upload NCES CCD and EDGE geocode data (both required)
- view district list and select NCES year
- edit district data
- view districts with missing data

### Admin
- all moderator permissions
- configure validation rules
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
- Missing data flags should be immediately understandable
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
- `district_size_raw`
- `district_size_normalized`
- `enrollment_raw`
- `enrollment_bucket`
- `grade_bands_raw`
- `grade_bands_normalized`
- `source_name`
- `source_record_reference`
- `source_last_updated_at`
- `ingested_at`
- `nces_year` (school year from NCES CCD, e.g., 2022 for 2021–22)
- `latitude`, `longitude` (from EDGE geocode file; NULL if not matched)
- `geocoded_at` (timestamp when coordinates were set)
- `has_missing_data` (flag)
- `missing_fields`
- `internal_notes`

---

## 17. Success Metrics

- % of uploaded districts successfully ingested
- count of districts with missing data (per upload / per NCES year)
- average time to process upload (by file size)
- number of moderator edits per ingested district

---

## 18. Risks

- NCES data may not map perfectly to required app fields
- Some important fields may require derivation or manual normalization
- Moderators may not understand whether a warning is safe to ignore
- Re-ingestion may overwrite intended manual corrections if not handled carefully
- Source timestamps may vary in quality or availability

---

## 19. Open Questions

- Which CCD file variant (directory vs universe) and exact columns to support for MVP?
- How to handle duplicate NCES IDs across uploads (overwrite, merge, skip)?
- Should re-upload preserve moderator overrides automatically or prompt?
- Will the system store raw NCES records verbatim, or only transformed snapshots?
- Which fields define "missing data" for the flag (required vs optional)?

---

## 20. Recommended MVP Decisions

- Use **dual file upload** (CCD district CSV + EDGE geocode CSV) as the district data input; no pre-seeded district list
- Accept standard CCD LEA directory format and EDGE Public LEA Geocode format; validate and parse both; join by LEAID
- Allow:
  - upload NCES file → automatic ingestion of all districts
  - browse districts and select NCES year when multiple years have been uploaded
  - edit districts when moderator wants to correct or enrich
- Flag districts that have missing data; surface in UI for editing
- Preserve source values separately from moderator overrides
- Make upload/ingestion asynchronous with visible progress and retry support

---

## Appendix A: Download Links

| File | Purpose | Download |
|------|---------|----------|
| **CCD LEA directory** | District names, state, LEAID, enrollment, grade bands, and district metadata | [CCD Data Files](https://nces.ed.gov/ccd/files.asp) — select LEA level and school year; download CSV |
| **EDGE Public LEA Geocode** | Latitude, longitude, locale for each district (LEAID) | [EDGE School Geocodes](https://nces.ed.gov/programs/edge/geographic/schoollocations) — "Public School District File"; extract CSV from ZIP |

**Important:** Select matching school years for both files (e.g., 2024–25 for both). The EDGE file URL pattern by year: `https://nces.ed.gov/programs/edge/data/EDGE_GEOCODE_PUBLICLEA_XXXX.zip` where XXXX = 2425 (2024–25), 2324 (2023–24), etc.