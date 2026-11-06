-- SamTube schema v1 — PostgreSQL 13+ (uses gen_random_uuid from pgcrypto, built in on PG13+)
-- Run with: node migrate.js   (or: psql -f migrations/001_schema.sql)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

/* ------------------------------- users & sessions ------------------------------ */

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name  text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

/* ------------------------- filter registry (server-owned) ------------------------ */

CREATE TABLE IF NOT EXISTS filter_categories (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort        integer NOT NULL DEFAULT 0,
  kind        text NOT NULL DEFAULT 'topic' CHECK (kind IN ('topic', 'utility')),
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS filter_definitions (
  id          text PRIMARY KEY,
  category_id text NOT NULL REFERENCES filter_categories(id) ON DELETE CASCADE,
  label       text NOT NULL,
  sort        integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS filter_definitions_cat_idx ON filter_definitions(category_id, sort);

/* ------------------------------ custom sections v1 ------------------------------ */

CREATE TABLE IF NOT EXISTS custom_sections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description        text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  icon               text NOT NULL DEFAULT '📁' CHECK (char_length(icon) <= 16),
  cover_url          text NOT NULL DEFAULT '',
  mode               text NOT NULL DEFAULT 'balanced'
                     CHECK (mode IN ('strict', 'balanced', 'discovery', 'custom')),
  relevance_threshold integer NOT NULL DEFAULT 45 CHECK (relevance_threshold BETWEEN 0 AND 100),
  language           text NOT NULL DEFAULT 'all' CHECK (language IN ('all', 'hi', 'en')),
  difficulty         text NOT NULL DEFAULT 'any'
                     CHECK (difficulty IN ('any', 'beginner', 'intermediate', 'advanced')),
  min_duration_sec   integer,
  max_duration_sec   integer,
  include_topics     text[] NOT NULL DEFAULT '{}',
  exclude_topics     text[] NOT NULL DEFAULT '{}',
  include_keywords   text[] NOT NULL DEFAULT '{}',
  exclude_keywords   text[] NOT NULL DEFAULT '{}',
  preferred_channels text[] NOT NULL DEFAULT '{}',
  blocked_channels   text[] NOT NULL DEFAULT '{}',
  sort               text NOT NULL DEFAULT 'smart'
                     CHECK (sort IN ('smart', 'oldest', 'newest', 'popular')),
  pinned             boolean NOT NULL DEFAULT false,
  hidden             boolean NOT NULL DEFAULT false,
  favorite           boolean NOT NULL DEFAULT false,
  position           integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS custom_sections_user_idx ON custom_sections(user_id, position, created_at);
CREATE INDEX IF NOT EXISTS custom_sections_user_pinned_idx ON custom_sections(user_id, pinned DESC, position);

/* Nested filter groups (AND/OR/NOT tree) — advanced engine; UI builder uses the flat
   columns above in v1, these tables keep the same config portable for Phase 3. */
CREATE TABLE IF NOT EXISTS section_filter_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES custom_sections(id) ON DELETE CASCADE,
  parent_id  uuid REFERENCES section_filter_groups(id) ON DELETE CASCADE,
  combinator text NOT NULL DEFAULT 'AND' CHECK (combinator IN ('AND', 'OR', 'NOT')),
  sort       integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS section_filter_groups_section_idx ON section_filter_groups(section_id);

CREATE TABLE IF NOT EXISTS section_filter_rules (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES custom_sections(id) ON DELETE CASCADE,
  group_id  uuid REFERENCES section_filter_groups(id) ON DELETE CASCADE,
  field     text NOT NULL CHECK (field IN ('topic', 'keyword', 'channel', 'duration', 'language', 'difficulty')),
  operator  text NOT NULL CHECK (operator IN ('contains', 'not_contains', 'equals', 'in', 'not_in', 'gt', 'lt', 'between')),
  value     jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS section_filter_rules_section_idx ON section_filter_rules(section_id);

/* ---------------------- personal collections (spec §2/§8/§9) --------------------- */

CREATE TABLE IF NOT EXISTS saved_videos (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   text NOT NULL,
  video      jsonb NOT NULL,
  saved_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id   text NOT NULL,
  video      jsonb NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
CREATE INDEX IF NOT EXISTS watch_history_user_time_idx ON watch_history(user_id, watched_at DESC);

CREATE TABLE IF NOT EXISTS playlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS playlists_user_idx ON playlists(user_id);

CREATE TABLE IF NOT EXISTS playlist_videos (
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id    text NOT NULL,
  video       jsonb NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs   jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blocked_topics (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);

CREATE TABLE IF NOT EXISTS blocked_channels (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

/* bookkeeping for future phases (AI classification, quota) */
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  endpoint   text NOT NULL,
  quota_cost integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_usage_logs_time_idx ON api_usage_logs(created_at);
