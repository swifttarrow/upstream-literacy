-- Users (identity, platform role, membership, profile)

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text,
  full_name text NOT NULL,
  professional_role text,
  bio text,
  district_id uuid REFERENCES districts (id),
  platform_role platform_role NOT NULL DEFAULT 'member',
  membership_status membership_status NOT NULL DEFAULT 'pending',
  is_demo_profile boolean NOT NULL DEFAULT false,
  profile_completed_at timestamptz,
  suspended_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_district ON users (district_id);
CREATE INDEX idx_users_membership_status ON users (membership_status);
CREATE INDEX idx_users_platform_role ON users (platform_role);
