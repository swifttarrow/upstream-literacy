-- Extensions and enum types (run first)
-- PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE platform_role AS ENUM ('member', 'moderator', 'admin');

CREATE TYPE membership_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TYPE conversation_type AS ENUM ('direct', 'group');

CREATE TYPE taxonomy_status AS ENUM ('draft', 'active', 'archived');

CREATE TYPE report_target_type AS ENUM ('user', 'message', 'conversation');

CREATE TYPE report_status AS ENUM ('open', 'in_review', 'resolved', 'dismissed');

CREATE TYPE moderation_action_type AS ENUM (
  'dismiss_report',
  'resolve_report',
  'warn_user',
  'suspend_user',
  'unsuspend_user',
  'delete_message',
  'close_conversation'
);

CREATE TYPE notification_type AS ENUM ('new_message', 'membership_status', 'moderation_update', 'system');

CREATE TYPE ai_artifact_kind AS ENUM ('conversation_summary', 'suggested_actions');

CREATE TYPE district_value_provenance AS ENUM ('ingest', 'override');
