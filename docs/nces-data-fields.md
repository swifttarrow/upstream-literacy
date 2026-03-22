# NCES Data Fields: Extracted and Available

This document describes what district data we extract from the NCES CCD + EDGE upload, and what other useful fields are available in the source files.

## File Roles: CCD, EDGE, and Optional Membership

| File | Purpose |
|------|---------|
| **CCD LEA Directory** | Required. District names, state, LEAID. No enrollment, no LOCALE. |
| **EDGE Public LEA Geocode** | Required. Coordinates (lat/lon) and **LOCALE** for each district. |
| **CCD LEA Membership** | Required. Enrollment counts. Directory file has none. |

## Currently Extracted (CCD + EDGE + Optional Membership Upload)

| Field | Source | Column(s) | Stored In | Notes |
|-------|--------|-----------|-----------|-------|
| **Name, State, LEAID** | CCD | `LEA_NAME`, `LEANM`, etc.; `ST`, `STABR`, etc.; `LEAID` | `district_candidates` | Required for ingestion. |
| **Coordinates** | EDGE | `LAT`/`LON`, `LATITUDE`/`LONGITUDE`, or auto-detected | `district_candidates.latitude`, `longitude` | From EDGE Public LEA Geocode file. |
| **LOCALE** | EDGE | `LOCALE`, `LOCALE_CD`, `LOCALE17`, `LOCALE15`, `LCITY15` | See below | **From geocode file, not CCD.** |
| **locale_code** | EDGE (derived) | From LOCALE | `district_candidates.locale_code` | Raw NCES code (11–43). |
| **locale_type** | EDGE (derived) | From LOCALE | `district_candidates.locale_type` | City, Suburb, Town, Rural. |
| **locale_subtype** | EDGE (derived) | From LOCALE | `district_candidates.locale_subtype` | Large/Midsize/Small (city/suburb) or Fringe/Distant/Remote (town/rural). |
| **locale_size** | EDGE (derived) | From locale_subtype | `district_candidates.locale_size` | Large, Medium, Small (city/suburb only); null for town/rural. |
| **district_type** | EDGE (derived) | From locale_size | `district_candidates.district_type` | large, mid, small (filter value); unknown when locale_size is null. |
| **Enrollment** | CCD Membership (C052) | `LEA_ENR`, `MEMBER`, `ENROLLMENT`, `TOTAL`, `TOTMENROL` | `district_candidates.enrollment` | **Requires optional Membership file upload.** Directory file has none. |

### NCES Locale Code Reference (11–43)

| Code | Type | Subtype | locale_size |
|------|------|---------|-------------|
| 11–13 | City | Large, Midsize, Small | Large, Medium, Small |
| 21–23 | Suburb | Large, Midsize, Small | Large, Medium, Small |
| 31–33 | Town | Fringe, Distant, Remote | null |
| 41–43 | Rural | Fringe, Distant, Remote | null |

### Where to Download the Membership File (Enrollment)

1. Go to **[NCES LEA Universe Survey Data](https://nces.ed.gov/ccd/pubagency.asp)** (pubagency.asp)
2. Scroll to your school year (e.g. 2017–18, 2015–16)
3. Find the **Membership** row (look for "ccd_lea_052" in the link)
4. Click **Flat File** or **Flat and SAS File** → download ZIP → extract the CSV

Example direct link for 2017–18 Membership: [ccd_lea_052_1718_l_1a_083118.zip](https://nces.ed.gov/ccd/Data/zip/ccd_lea_052_1718_l_1a_083118.zip)

### All Files Upload via R2/S3

All uploads (CCD, EDGE, and Membership) go through Cloudflare R2 or AWS S3 via presigned URLs. There is no file size limit — large files (e.g. 650MB Membership) upload directly to cloud storage, and the backend streams them for parsing. **Requires S3 or R2 to be configured.** See [docs/direct-upload-setup.md](./direct-upload-setup.md) for setup.

---

## Other Useful Fields Available in CCD LEA Files

These fields exist in typical CCD LEA directory / agency files and could be added to ingestion:

| Field | Typical CCD Column(s) | Use Case |
|-------|------------------------|----------|
| **City** | `LCITY`, `CITY`, `LEA_CITY` | Address display, geocoding fallback |
| **County** | `COUNTY`, `LCOUNTY`, `CNTY` | Geography filter, reporting |
| **Number of schools** | `SCH`, `LEA_SCH`, `NSCH` | District size proxy |
| **Agency type** | `TYPE`, `AGENCY_TYPE`, `OP_TYPE` | Charter vs regular, operational status (1–8 codes) |
| **Lowest / highest grade** | `GSLO`, `GSHI`, `LGRADE`, `HGRADE` | Grade span (e.g. PK–12) |
| **Operational status** | `OPSTFIPS`, `OPERATIONAL` | Open vs closed districts |
| **Phone** | `PHONE`, `PHONE_NUM` | Contact info |

---

## FRPL and EL (School-Level, Not LEA-Level in CCD)

- **Free/reduced-price lunch (FRPL):** CCD collects FRPL at the **school level**, not LEA level. To get district FRPL, you would need to aggregate from the CCD School file.
- **English learners (EL):** Similarly, EL counts are in school-level membership files. Aggregation from the school file would be required.

---

## Recommended Next Additions

1. **City** — Low effort, useful for display and geocoding.
2. **County** — Low effort, useful for geography filters.
3. **Number of schools** — Useful as a district-size signal if enrollment is missing.
4. **Agency type** — Helps distinguish charters and other special agencies.

To add these, extend the CCD parsing in `backend/src/routes/ingestion.ts` (the `getCol` calls and `RowToInsert` interface), add corresponding columns to `district_candidates` if needed, and update `district_attribute_definitions` for any new ingested attributes.
