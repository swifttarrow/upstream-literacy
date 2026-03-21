export type PlatformRole = 'member' | 'moderator' | 'admin';
export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ConversationType = 'direct' | 'group';
export type TaxonomyStatus = 'draft' | 'active' | 'archived';
export type ReportTargetType = 'user' | 'message' | 'conversation';
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
export type ModerationActionType =
  | 'dismiss_report'
  | 'resolve_report'
  | 'warn_user'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'delete_message'
  | 'close_conversation';
export type NotificationType =
  | 'new_message'
  | 'connection_request'
  | 'connection_accepted'
  | 'membership_status'
  | 'moderation_update'
  | 'system';
export type AiArtifactKind = 'conversation_summary' | 'suggested_actions';
export type DistrictValueProvenance = 'ingest' | 'override';
export type ConnectionStatus = 'pending' | 'accepted';

export interface User {
  id: string;
  email: string;
  full_name: string;
  professional_role: string | null;
  bio: string | null;
  district_id: string | null;
  platform_role: PlatformRole;
  membership_status: MembershipStatus;
  is_demo_profile: boolean;
  profile_completed_at: Date | null;
  suspended_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface District {
  id: string;
  name: string;
  slug: string | null;
  country_code: string | null;
  state_region: string | null;
  city: string | null;
  external_ref: string | null;
  is_demo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  platform_role: PlatformRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    jwtUser?: JwtPayload;
  }
}
