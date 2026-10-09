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

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  redirect TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS app_code TEXT;

CREATE TABLE IF NOT EXISTS auth_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  intake JSONB NOT NULL,
  idea JSONB NOT NULL,
  kit JSONB NOT NULL,
  coach TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_tasks (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS business_leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_checkins (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_money (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_ideas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  intake JSONB NOT NULL,
  idea JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_cache (
  key TEXT PRIMARY KEY,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE business_leads ADD COLUMN IF NOT EXISTS reply_draft TEXT;

CREATE TABLE IF NOT EXISTS push_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_visits (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  views INT NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, day)
);

CREATE TABLE IF NOT EXISTS idea_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  ms INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS autopilot_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS scouted_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS site_tuned_at TIMESTAMPTZ;
ALTER TABLE business_leads ADD COLUMN IF NOT EXISTS status_at TIMESTAMPTZ;
ALTER TABLE business_leads ADD COLUMN IF NOT EXISTS nudged_at TIMESTAMPTZ;
ALTER TABLE business_leads ADD COLUMN IF NOT EXISTS followup_draft TEXT;

CREATE TABLE IF NOT EXISTS agent_log (
  id BIGSERIAL PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task TEXT NOT NULL,
  model TEXT NOT NULL,
  source TEXT,
  user_id TEXT,
  business_id TEXT,
  input_tokens INT NOT NULL DEFAULT 0,
  cached_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  reasoning_tokens INT NOT NULL DEFAULT 0,
  searches INT NOT NULL DEFAULT 0,
  ms INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS gap_hunts (
  key TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  gaps JSONB NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS test_reported_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS auto_reply BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS telegram_channel JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS telegram_code TEXT;
ALTER TABLE business_leads ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'site';
ALTER TABLE business_leads ADD COLUMN IF NOT EXISTS channel_ref TEXT;

CREATE TABLE IF NOT EXISTS lead_messages (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES business_leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS tg_message_id BIGINT;

CREATE TABLE IF NOT EXISTS telegram_chats (
  chat_id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_channel_ref ON business_leads(channel, channel_ref, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_telegram_code ON businesses(telegram_code) WHERE telegram_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_log_business ON agent_log(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_autopilot ON businesses(status, autopilot_at);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_money_business ON business_money(business_id, kind);
CREATE INDEX IF NOT EXISTS idx_checkins_business ON business_checkins(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_business_status ON business_tasks(business_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_research_cache_created ON research_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_ideas_user ON saved_ideas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_user ON businesses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_business ON business_tasks(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_business ON business_leads(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user ON earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_user ON launch_progress(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event, created_at DESC);
