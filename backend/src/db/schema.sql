CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS money_profiles (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  budget_usd NUMERIC NOT NULL,
  time_hours TEXT NOT NULL,
  has_car BOOLEAN NOT NULL DEFAULT FALSE,
  channel TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_profiles (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  location TEXT NOT NULL,
  ad_budget TEXT NOT NULL,
  has_audience BOOLEAN NOT NULL DEFAULT FALSE,
  remote_ok BOOLEAN NOT NULL DEFAULT FALSE,
  goal TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS launch_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  launch_id TEXT NOT NULL,
  current_step_index INT NOT NULL DEFAULT 0,
  completed_step_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  simulated_published BOOLEAN NOT NULL DEFAULT FALSE,
  lead_id TEXT,
  booked BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, launch_id)
);

CREATE TABLE IF NOT EXISTS earnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  launch_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  launch_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  zip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  event TEXT NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_user ON launch_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event, created_at DESC);
