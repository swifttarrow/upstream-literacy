# Spec — School District Data Ingestion Console

## 1. Overview

Build an internal moderator-facing data ingestion console that allows moderators to ingest, review, validate, and edit school district data sourced from NCES. The system should support an initial seed set of **100 real school districts** and provide a repeatable workflow for ingesting additional districts over time.

The ingestion experience should be transparent and operationally safe:
- moderators can preview district data before ingesting
- moderators can trigger ingestion from the UI
- moderators can monitor progress
- moderators can detect and resolve missing or invalid data
- moderators can edit data after ingestion

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

- Allow moderators to ingest district data from NCES-backed records through a UI
- Support an initial ingestion set of **100 real school districts**
- Allow moderators to preview district data before ingesting
- Provide clear ingestion progress and status
- Surface errors and missing data during ingestion
- Allow moderators to edit district data after ingestion
- Create an auditable workflow for district data operations

---

## 4. Non-Goals (MVP)

- Fully automated ingestion of all U.S. school districts
- Real-time sync with NCES
- Public user-facing editing of district records
- Bulk ingestion from arbitrary third-party CSVs
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
- As a moderator, I want to see a list of candidate school districts so I can choose what to ingest.
- As a moderator, I want to preview district data before ingestion so I can verify quality.
- As a moderator, I want to trigger ingestion from the UI so I do not need engineering support.
- As a moderator, I want to see progress while ingestion is running so I know what is happening.
- As a moderator, I want to see errors and missing fields so I can fix or follow up on bad data.
- As a moderator, I want to edit ingested district data so I can correct issues after import.
- As a moderator, I want an audit trail of ingestion actions so changes are accountable.

### Admin
- As an admin, I want to configure ingestion behavior and review data quality outcomes at scale.

---

## 7. Scope

### In Scope
- Internal moderator UI for district ingestion
- Initial 100 real district seed records based on the approved NCES-backed starter set
- District preview before ingestion
- Ingest action from the UI
- Progress tracking
- Error reporting
- Missing data flagging
- Post-ingestion editing
- Audit logging

### Out of Scope
- User-facing district editing
- Automated recurring NCES sync
- Large-scale bulk import management for thousands of districts
- External data-source switching in MVP

---

## 8. Source Data Assumptions

The ingestion workflow will use **NCES-backed district records** as the source of truth for the MVP seed set.

### Initial 100-district seed set
The system should support an initial preloaded list of 100 real districts, based on the previously curated district list. These districts should be mapped to NCES source records before ingestion into the app database.

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

## 10.1 Ingestion Dashboard

The system shall provide an internal moderator-facing ingestion dashboard.

The dashboard shall show:
- total candidate districts available in seed list
- number not yet ingested
- number successfully ingested
- number with warnings
- number with errors
- most recent ingestion jobs
- quick access to review missing/flagged records

The dashboard should support:
- search by district name
- filter by state
- filter by ingestion status
- filter by warning/error state

---

## 10.2 District Candidate List

The system shall display the initial **100 real district candidates** as ingestible records.

Each row should show:
- district name
- state
- NCES identifier
- current ingestion status
- missing data indicator
- last source refresh timestamp if available

Possible statuses:
- Not Ingested
- Ready to Ingest
- In Progress
- Ingested
- Ingested with Warnings
- Failed

The moderator shall be able to:
- click into a district record
- preview source data
- ingest one district
- select multiple districts for batch ingestion

### 🏙️ Large / Urban Districts (30)

1. New York City Department of Education (NY)
2. Los Angeles Unified School District (CA)
3. Chicago Public Schools (IL)
4. Miami-Dade County Public Schools (FL)
5. Dallas Independent School District (TX)
6. Houston Independent School District (TX)
7. Clark County School District (NV)
8. Broward County Public Schools (FL)
9. Hillsborough County Public Schools (FL)
10. Orange County Public Schools (FL)
11. San Diego Unified School District (CA)
12. School District of Philadelphia (PA)
13. Fairfax County Public Schools (VA)
14. Montgomery County Public Schools (MD)
15. Gwinnett County Public Schools (GA)
16. Charlotte-Mecklenburg Schools (NC)
17. Cobb County School District (GA)
18. Wake County Public School System (NC)
19. Prince George’s County Public Schools (MD)
20. Duval County Public Schools (FL)
21. Shelby County Schools (TN)
22. Metro Nashville Public Schools (TN)
23. Denver Public Schools (CO)
24. Boston Public Schools (MA)
25. Seattle Public Schools (WA)
26. Detroit Public Schools Community District (MI)
27. Baltimore City Public Schools (MD)
28. Milwaukee Public Schools (WI)
29. Albuquerque Public Schools (NM)
30. Jefferson County Public Schools (KY)

---

### 🏘️ Mid-size / Suburban Districts (40)

31. Plano Independent School District (TX)
32. Frisco Independent School District (TX)
33. Round Rock Independent School District (TX)
34. Northside Independent School District (TX)
35. Katy Independent School District (TX)
36. Irvine Unified School District (CA)
37. Elk Grove Unified School District (CA)
38. Fresno Unified School District (CA)
39. Long Beach Unified School District (CA)
40. Mesa Public Schools (AZ)
41. Chandler Unified School District (AZ)
42. Scottsdale Unified School District (AZ)
43. Cherry Creek School District (CO)
44. Douglas County School District (CO)
45. Adams 12 Five Star Schools (CO)
46. Blue Valley School District (KS)
47. Olathe Public Schools (KS)
48. Shawnee Mission School District (KS)
49. Naperville Community Unit School District 203 (IL)
50. Indian Prairie School District 204 (IL)
51. Community High School District 128 (IL)
52. Loudoun County Public Schools (VA)
53. Arlington Public Schools (VA)
54. Howard County Public School System (MD)
55. Anne Arundel County Public Schools (MD)
56. Prince William County Public Schools (VA)
57. Forsyth County Schools (GA)
58. Fulton County Schools (GA)
59. DeKalb County School District (GA)
60. Cabarrus County Schools (NC)
61. Union County Public Schools (NC)
62. Williamson County Schools (TN)
63. Knox County Schools (TN)
64. Hamilton County Schools (TN)
65. Beaverton School District (OR)
66. Hillsboro School District (OR)
67. Washoe County School District (NV)
68. Davis School District (UT)
69. Jordan School District (UT)
70. Granite School District (UT)

---

### 🌾 Small / Rural Districts (30)

71. Bozeman Public Schools (MT)
72. Missoula County Public Schools (MT)
73. Helena Public Schools (MT)
74. Laramie County School District 1 (WY)
75. Sheridan County School District 2 (WY)
76. Teton County School District #1 (WY)
77. Rapid City Area Schools (SD)
78. Sioux Falls School District (SD)
79. Bismarck Public Schools (ND)
80. Fargo Public Schools (ND)
81. Moorhead Area Public Schools (MN)
82. Duluth Public Schools (MN)
83. Mankato Area Public Schools (MN)
84. Ames Community School District (IA)
85. Iowa City Community School District (IA)
86. Cedar Falls Community Schools (IA)
87. Lawrence Public Schools (KS)
88. Manhattan-Ogden USD 383 (KS)
89. Columbia Public Schools (MO)
90. Springfield Public Schools (MO)
91. Fayetteville Public Schools (AR)
92. Bentonville School District (AR)
93. Stillwater Public Schools (OK)
94. Edmond Public Schools (OK)
95. Norman Public Schools (OK)
96. Flagstaff Unified School District (AZ)
97. Santa Fe Public Schools (NM)
98. Durango School District 9-R (CO)
99. Aspen School District (CO)
100. Steamboat Springs School District (CO)

---

## 10.3 District Preview

The system shall provide a district preview screen before ingestion.

The preview shall show:
- raw source values
- normalized app values
- field-level missing value indicators
- source metadata
- any transformation notes

The preview should clearly distinguish:
- source-provided values
- system-normalized values
- empty/missing values
- manually overridden values if any exist

Example preview sections:
- Identity
- Demographics / district context
- Matching-ready normalized fields
- Data quality warnings
- Source metadata

The moderator shall be able to:
- confirm ingestion
- cancel
- optionally edit allowed fields before final ingest if pre-ingestion editing is enabled

---

## 10.4 Ingest Action

The system shall allow moderators to initiate ingestion from the UI.

The system shall support:
- single-district ingestion
- batch ingestion of selected districts
- ingest-all for the initial seed set, gated by confirmation

When ingestion starts, the system shall:
- create an ingestion job record
- assign job status
- begin processing selected records
- prevent duplicate active ingestion for the same district

The system should require confirmation before:
- batch ingestion
- ingest-all
- re-ingesting an already ingested district

---

## 10.5 Ingestion Progress

The system shall display ingestion progress during active ingestion.

For each ingestion job, the UI shall show:
- total records selected
- records completed
- records remaining
- records succeeded
- records succeeded with warnings
- records failed
- current active record
- started at timestamp
- elapsed time

The UI should provide:
- progress bar
- per-record status updates
- live or near-live refresh
- final job summary

The system may support:
- background processing for long-running batch jobs
- retry failed records from the same job

---

## 10.6 Error Capture

The system shall capture and display ingestion errors.

Error types may include:
- source record not found
- NCES identifier mismatch
- validation failure
- duplicate district conflict
- required field missing
- normalization failure
- database write failure

Each error entry shall include:
- district name
- district identifier
- error type
- human-readable error message
- timestamp
- job id
- retry eligibility

The moderator shall be able to:
- inspect error details
- retry eligible failures
- manually correct and re-run ingestion

---

## 10.7 Missing Data Detection

The system shall detect and flag missing or incomplete data required for district matching or display.

The system shall identify missing data at:
- field level
- record level
- job summary level

Examples of fields to flag if missing:
- district type / locale
- enrollment or enrollment bucket
- FRL bucket
- EL bucket
- grade bands
- source timestamp

The UI shall notify the moderator when:
- a district can be ingested but has incomplete data
- a district cannot be ingested because required fields are missing
- a completed ingestion includes warnings

Possible warning states:
- Missing Optional Data
- Missing Required Matching Data
- Derived Value Used
- Source Metadata Incomplete

The system should allow configurable rules for:
- hard-stop missing fields
- warning-only missing fields

---

## 10.8 Notifications and Alerts

The system shall notify the moderator in the UI when:
- an ingestion job starts
- an ingestion job completes
- an ingestion job completes with warnings
- an ingestion job fails
- missing required data is detected

The system may later support:
- email notifications for long-running batch jobs
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

The system shall maintain an audit log for district ingestion operations.

Audited actions shall include:
- preview viewed
- ingestion started
- ingestion completed
- ingestion retried
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

## 10.11 Re-Ingestion / Refresh

The system should allow moderators to re-run ingestion for an already ingested district.

Possible use cases:
- source data changed
- previous record had missing fields
- normalization rules were updated

The system shall:
- show current ingested version
- show incoming preview version
- warn before overwrite or merge
- preserve historical ingestion records

---

## 11. UX / Screen-Level Spec

## 11.1 Ingestion Dashboard
Primary screen for moderator operations.

### Key UI components
- top summary cards
  - Not Ingested
  - Ingested
  - Warnings
  - Failed
- district table
- filter bar
- recent jobs panel
- CTA buttons:
  - Ingest Selected
  - Retry Failed
  - View Warnings

---

## 11.2 District Detail / Preview Screen

### Sections
- header
  - district name
  - state
  - NCES id
  - status
- source data card
- normalized data card
- missing fields / warnings card
- source metadata card
- action bar
  - Ingest
  - Edit Before Ingest (optional)
  - Cancel

---

## 11.3 Ingestion Job Detail Screen

### Sections
- job summary
- progress bar
- live record list
- succeeded / warning / failed tabs
- retry failed button
- completion summary

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
- preview district data
- trigger ingestion
- edit ingested district data
- retry failed ingestion
- view warnings/errors

### Admin
- all moderator permissions
- configure validation rules
- manage source mappings
- manage ingest-all operations
- view all audit logs

---

## 14. Non-Functional Requirements

## 14.1 Performance
- District preview should load quickly enough for operational use
- Single-district ingestion should complete within an acceptable interactive window
- Batch ingestion should run asynchronously without blocking the UI
- Progress updates should refresh frequently enough to reassure moderators

## 14.2 Security
- Ingestion console shall require authenticated internal access
- Role-based access shall restrict ingestion and edit capabilities
- Audit logs shall be retained for district data changes
- Source-backed data and overrides shall be clearly separated

## 14.3 Usability
- Moderators should be able to ingest a district with minimal training
- Missing values and warnings should be immediately understandable
- Errors should be actionable and not overly technical
- Progress states should be visible and clear

## 14.4 Maintainability
- Ingestion logic should be modular and reusable
- Source mapping and normalization rules should be configurable
- Error categories should be standardized
- Data validation should be testable

## 14.5 Scalability
- System should support growth beyond the initial 100 districts
- Batch ingestion should remain stable as ingestion volume grows
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

## 16. Suggested Initial Seed Fields

For each of the 100 districts, the MVP ingestion flow should support:

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

- % of initial 100 districts successfully ingested
- % of ingested districts with warnings
- % of failed ingestions retried successfully
- average time to ingest one district
- average time to ingest full seed batch
- number of moderator edits per ingested district
- reduction in missing critical fields over time

---

## 18. Risks

- NCES data may not map perfectly to required app fields
- Some important fields may require derivation or manual normalization
- Moderators may not understand whether a warning is safe to ignore
- Re-ingestion may overwrite intended manual corrections if not handled carefully
- Source timestamps may vary in completeness

---

## 19. Open Questions

- Which fields are hard-required vs warning-only for MVP ingestion?
- Should moderators be allowed to edit before ingest, or only after ingest?
- Should ingest-all be moderator-visible or admin-only?
- Should re-ingestion merge with overrides or preserve overrides automatically?
- Will the system store raw NCES records verbatim, or only transformed snapshots?

---

## 20. Recommended MVP Decisions

- Use the curated **100 real district seed list** as the initial ingestion pool
- Back the seed list with mapped NCES identifiers before exposing the UI
- Allow:
  - single ingest
  - batch ingest
  - preview before ingest
  - edit after ingest
- Treat missing matching-critical fields as warnings first unless they block core product functionality
- Preserve source values separately from moderator overrides
- Make batch jobs asynchronous with visible progress and retry support