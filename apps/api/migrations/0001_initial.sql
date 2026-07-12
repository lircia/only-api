CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai-compatible',
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  health_message TEXT NOT NULL DEFAULT '',
  health_latency_ms INTEGER NOT NULL DEFAULT 0,
  working_url TEXT NOT NULL DEFAULT '',
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS model_catalog (
  id TEXT PRIMARY KEY,
  channel_id TEXT,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  api_key_id TEXT,
  channel_id TEXT,
  model TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS worker_usage_snapshots (
  id TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  cpu_time_ms INTEGER NOT NULL DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_status_priority ON channels(status, priority);

INSERT OR IGNORE INTO system_settings (key, value) VALUES
  ('siteName', '"Only API"'),
  ('appMode', '"self"'),
  ('registrationEnabled', 'false'),
  ('emailVerificationEnabled', 'false'),
  ('captchaEnabled', 'false'),
  ('captchaSiteKey', '""'),
  ('themeName', '"black-white"'),
  ('themeDefaultPinned', 'true'),
  ('backgroundImageUrl', '""'),
  ('emailDomainValidationEnabled', 'false'),
  ('qqEmailNumericPrefixRequired', 'false'),
  ('healthCheckIntervalMinutes', '60'),
  ('workerUsageIntervalMinutes', '360'),
  ('lastHealthCheckAt', '""'),
  ('lastWorkerUsageCheckAt', '""'),
  ('defaultChannelStrategy', '"priority"'),
  ('notifyWorkerUsage', 'false'),
  ('frontendUmamiEnabled', 'false'),
  ('frontendUmamiScriptUrl', '""'),
  ('frontendUmamiWebsiteId', '""'),
  ('frontendUmamiHostUrl', '""'),
  ('backendUmamiEnabled', 'false'),
  ('backendUmamiHostUrl', '""'),
  ('backendUmamiWebsiteId', '""'),
  ('backendUmamiHostname', '""');
