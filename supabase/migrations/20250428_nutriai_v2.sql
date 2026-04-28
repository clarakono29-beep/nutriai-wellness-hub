-- ============================================================
-- NutriAI v2 — Database migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add stripe_customer_id to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Index for Stripe webhook lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2. Extend subscriptions table with new columns
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'monthly' CHECK (plan IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Index for webhook upserts
CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_id_idx
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 3. Meal plans table (for persisting AI-generated plans server-side)
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooking_time TEXT,
  budget TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meal_plans_self" ON meal_plans;
CREATE POLICY "meal_plans_self" ON meal_plans
  FOR ALL USING (auth.uid() = user_id);

-- Only keep the latest plan per user (optional cleanup trigger)
CREATE INDEX IF NOT EXISTS meal_plans_user_id_idx ON meal_plans (user_id);

-- 4. Body measurements table (for future micronutrient / body comp tracking)
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,1),
  notes TEXT
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "body_measurements_self" ON body_measurements;
CREATE POLICY "body_measurements_self" ON body_measurements
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS body_measurements_user_date_idx
  ON body_measurements (user_id, logged_at DESC);

-- 5. Food favourites table (synced across devices)
CREATE TABLE IF NOT EXISTS food_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fdc_id INTEGER,
  food_name TEXT NOT NULL,
  emoji TEXT,
  per100_kcal NUMERIC(7,2),
  per100_protein NUMERIC(5,2),
  per100_carbs NUMERIC(5,2),
  per100_fat NUMERIC(5,2),
  per100_fibre NUMERIC(5,2),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE food_favourites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food_favourites_self" ON food_favourites;
CREATE POLICY "food_favourites_self" ON food_favourites
  FOR ALL USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS food_favourites_user_food_idx
  ON food_favourites (user_id, fdc_id)
  WHERE fdc_id IS NOT NULL;

-- 6. Nutrition insights cache table
CREATE TABLE IF NOT EXISTS nutrition_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  insights JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nutrition_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_insights_self" ON nutrition_insights;
CREATE POLICY "nutrition_insights_self" ON nutrition_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS nutrition_insights_user_week_idx
  ON nutrition_insights (user_id, week_start);

-- 7. Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON meal_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON body_measurements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON food_favourites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nutrition_insights TO authenticated;

-- Done! ✅
-- Remember to set these Supabase secrets:
-- supabase secrets set USDA_API_KEY=your_key
-- supabase secrets set STRIPE_SECRET_KEY=sk_live_...
-- supabase secrets set STRIPE_PRICE_MONTHLY=price_...
-- supabase secrets set STRIPE_PRICE_ANNUAL=price_...
-- supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
-- supabase secrets set APP_URL=https://your-domain.com
