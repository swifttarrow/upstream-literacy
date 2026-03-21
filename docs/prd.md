# PRD - District Community Matching Platform

## 1. Summary

A community-driven platform for school district staff to discover, connect, and collaborate with peers facing similar challenges. The system combines structured matching (based on district attributes and problem statements) with real-time messaging and small-group interactions.

---

## 2. Problem Statement

District leaders struggle to find relevant peers facing similar challenges. Existing communities are noisy and unstructured, making it difficult to identify comparable districts and have meaningful exchanges.

This platform enables:

* Structured peer discovery
* Problem-based matching
* High-signal conversations

---

## 3. Goals

* Enable fast discovery of relevant peer districts
* Improve quality of connections through structured matching
* Support meaningful, real-time collaboration
* Maintain a trusted, moderated environment

---

## 4. Out-of-scope

* Public social feed
* ML-based recommendation engine
* Broad dataset ingestion
* Vendor participation
* Fully automated moderation

---

## 5. Users

### Primary

* School district staff (admins, curriculum leaders, etc.)

### Secondary

* Moderators
* Platform admins

---

## 6. Core User Jobs

* Find similar districts
* Identify peers solving the same problems
* Connect with peers (send/accept connection requests)
* Start conversations
* Collaborate in small groups

---

## 7. Key Product Decisions

### Matching

* Problem-first matching (primary signal)
* District attributes as secondary filters
* 1 primary problem + optional secondary problems

### Network Model

* Single unified network (no predefined communities)
* LinkedIn-style connections: users send connection requests; once accepted, they are connected and can message

### Messaging

* Direct messaging between connected users only
* Small-group conversations (max 8 users)
* Real-time messaging (websockets)

### Group Formation

* Groups created from connected users only

### Onboarding

* Soft gate: browsing allowed immediately
* Messaging requires profile completion (district + primary problem)

### Cold Start

* Show "close matches" when exact matches unavailable
* Use seeded/demo profiles if needed

### Moderation

* Neutral moderation model
* Metadata visibility across all conversations
* Content visibility only for reported conversations

### AI

* User-scoped AI only
* AI can summarize and suggest actions within user-visible conversations

### Data Strategy

* Small, high-confidence dataset
* Bucketed, normalized, source-labeled

---

## 8. Functional Requirements

### 8.1 Authentication & Access

* User registration and login
* Role-based access (member, moderator, admin)
* Membership approval/verification

### 8.2 User Profiles

* Name, role, district
* Bio
* Problem selection (primary + secondary)

### 8.3 District Data

* Ingest public data
* Normalize and bucket attributes
* Display source + timestamp
* Allow admin overrides

### 8.4 Problem Taxonomy

* Predefined list
* Admin-managed
* Categorized

### 8.5 Discovery & Matching

* Filter by:

  * problem
  * district attributes
  * role
  * geography
* Ranked results (suggested connections)
* Match explanations
* Exact vs close match labeling
* Connection requests: user can send request to any discovered peer; recipient accepts or rejects

### 8.6 Connections

* Send connection request to any user
* Accept or reject incoming requests
* List connections (connected), pending sent, pending received
* Messaging gate: only connected users can direct message

### 8.7 Messaging

* Real-time 1:1 messaging (between connected users)
* Real-time group messaging (max 8)
* Conversation history
* Contextual prompts (shared problem)

### 8.8 Groups

* Create groups from connected users
* Join/leave groups

### 8.9 Moderation

* Report content
* Moderator review
* User suspension
* Audit logs

### 8.10 Notifications

* New messages
* Connection request received/accepted
* Status updates

### 8.11 AI Features

* Conversation summarization
* Suggested next steps
* Limited to user-visible content

---

## 9. Non-Functional Requirements

### Performance

* Match results < 2s
* Real-time messaging latency minimal

### Security

* Authenticated access
* RBAC
* Encrypted data in transit

### Usability

* Fast onboarding
* Clear match explanations

### Maintainability

* Modular architecture
* Configurable matching logic

### Scalability

* Support growth in users, messages, and data
* Search remains performant

---

## 10. Architecture Overview

### Approach

* Modular monolith

### Core Domains

* Identity
* District Data
* Taxonomy
* Matching
* Connections
* Conversations
* Moderation
* Notifications

### Tech Choices

* Relational DB (Postgres)
* Backend API (monolith)
* Web frontend
* Background jobs
* Websockets for messaging

---

## 11. Data Model (High-Level)

* Users
* Districts
* ProblemStatements
* UserProblemSelections
* UserConnections (pending | accepted)
* Conversations
* Messages
* Reports
* AuditLogs

---

## 12. MVP Scope

### In Scope

* Auth + profiles
* District data ingestion
* Problem taxonomy
* Matching + filtering
* Real-time messaging
* Groups (max 8)
* Moderation tools

### Out of Scope

* ML recommendations
* Global AI insights
* Advanced analytics
* Public communities

---

## 13. Success Metrics

* Time to first match
* Messages sent per user
* Response rate
* Weekly active users

---

## 14. Risks

* Poor data quality
* Low initial engagement
* Over-complex filtering
* Weak taxonomy