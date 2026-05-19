-- Table for storing Web Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Personal app — allow all operations without auth
CREATE POLICY "allow_all" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Add hora column to recordatorios for scheduled push delivery
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS hora TEXT NOT NULL DEFAULT '09:00';
