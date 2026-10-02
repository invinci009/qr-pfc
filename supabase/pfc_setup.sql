-- ==============================================================================
-- PFC — PATNA FRIED CHICKEN COMPLETE SUPABASE DATABASE SETUP & SEED SCRIPT
-- Location: Shop No. 4, Divya Apartment, Near Gold's Gym, Ashiyana Digha Road, Patna
-- Contact Number: 7091719475
-- Run this in the Supabase SQL Editor of your Supabase Project.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 2. TABLE DEFINITIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'restaurant' CHECK (category IN ('restaurant')),
  location TEXT,
  phone TEXT,
  secondary_phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#e11d48',
  welcome_message JSONB,
  google_review_url TEXT,
  default_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS secondary_phone TEXT;

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  google_review_url_override TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rating', 'single_choice', 'multi_choice', 'text')),
  text JSONB NOT NULL,
  config JSONB DEFAULT '{}',
  required BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, key)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'landed' CHECK (status IN ('landed', 'in_progress', 'completed')),
  language TEXT DEFAULT 'en',
  device_type TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  ip_hash TEXT,
  ua_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS review_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  original_text TEXT,
  final_text TEXT,
  method TEXT CHECK (method IN ('llm', 'template', 'empty', 'fallback')),
  copied_at TIMESTAMPTZ,
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS google_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS private_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'service', 'waiting_time', 'cleanliness', 'billing', 'other')),
  message TEXT NOT NULL,
  contact_name TEXT,
  contact_value TEXT,
  contact_consent BOOLEAN DEFAULT false,
  customer_contact TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'acknowledged', 'resolved')),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS contact_value TEXT;
ALTER TABLE private_feedback ADD COLUMN IF NOT EXISTS contact_consent BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  campaign_id UUID,
  business_id UUID,
  event_type TEXT NOT NULL,
  client_event_id UUID,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, client_event_id)
);

CREATE TABLE IF NOT EXISTS session_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  business_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_flags ENABLE ROW LEVEL SECURITY;

-- Anonymous public read access
DROP POLICY IF EXISTS "Public can view businesses" ON businesses;
CREATE POLICY "Public can view businesses" ON businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view active campaigns" ON campaigns;
CREATE POLICY "Public can view active campaigns" ON campaigns FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Public can view active questions" ON questions;
CREATE POLICY "Public can view active questions" ON questions FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Public can view active menu_items" ON menu_items;
CREATE POLICY "Public can view active menu_items" ON menu_items FOR SELECT USING (active = true);

-- Service role bypasses RLS automatically. Allow authenticated owners to manage their data
DROP POLICY IF EXISTS "Owners can manage own business" ON businesses;
CREATE POLICY "Owners can manage own business" ON businesses
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can manage campaigns" ON campaigns;
CREATE POLICY "Owners can manage campaigns" ON campaigns
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage menu_items" ON menu_items;
CREATE POLICY "Owners can manage menu_items" ON menu_items
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage questions" ON questions;
CREATE POLICY "Owners can manage questions" ON questions
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view sessions" ON sessions;
CREATE POLICY "Owners can view sessions" ON sessions
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view private feedback" ON private_feedback;
CREATE POLICY "Owners can view private feedback" ON private_feedback
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view events" ON events;
CREATE POLICY "Owners can view events" ON events
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view session flags" ON session_flags;
CREATE POLICY "Owners can view session flags" ON session_flags
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- =============================================================
-- 4. FUNCTION TO SEED DEFAULT QUESTIONS
-- =============================================================
CREATE OR REPLACE FUNCTION seed_default_questions(p_business_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO questions (business_id, key, type, text, config, required, position, active) VALUES
    (
      p_business_id,
      'overall_rating',
      'rating',
      '{"en": "How was your overall experience at PFC?"}'::jsonb,
      '{"scale": 5, "min_label": "Poor", "max_label": "Crispy & Fantastic!"}'::jsonb,
      true,
      1,
      true
    ),
    (
      p_business_id,
      'food_rating',
      'rating',
      '{"en": "How did you like the food (taste, crunch, freshness)?"}'::jsonb,
      '{"scale": 5, "min_label": "Poor", "max_label": "Super Crispy!"}'::jsonb,
      true,
      2,
      true
    ),
    (
      p_business_id,
      'service_rating',
      'rating',
      '{"en": "How was the service & order speed?"}'::jsonb,
      '{"scale": 5, "min_label": "Slow", "max_label": "Super Fast"}'::jsonb,
      true,
      3,
      true
    ),
    (
      p_business_id,
      'liked',
      'multi_choice',
      '{"en": "What did you enjoy most about PFC today?"}'::jsonb,
      '{"options": ["Extra Crispy Chicken", "Spicy Seasoning", "Zinger Burgers", "Quick Delivery / Takeaway", "Friendly Staff", "Clean Dine-in"]}'::jsonb,
      false,
      4,
      true
    ),
    (
      p_business_id,
      'ordered',
      'multi_choice',
      '{"en": "Which items did you enjoy today?"}'::jsonb,
      '{"dynamic": "menu_items"}'::jsonb,
      false,
      5,
      true
    ),
    (
      p_business_id,
      'customer_contact',
      'text',
      '{"en": "Your Name & Mobile Number (Optional)"}'::jsonb,
      '{"placeholder": "Enter mobile number for special offers"}'::jsonb,
      false,
      6,
      true
    )
  ON CONFLICT (business_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 5. SEED PATNA FRIED CHICKEN (PFC) RECORD & CAMPAIGNS
-- =============================================================
DO $$
DECLARE
  v_owner_id UUID;
  v_business_id UUID;
BEGIN
  -- Look for existing auth user
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  -- 1. Check if PFC already exists
  SELECT id INTO v_business_id FROM businesses WHERE name ILIKE '%Fried Chicken%' OR name ILIKE '%PFC%' LIMIT 1;

  IF v_business_id IS NULL THEN
    INSERT INTO businesses (
      owner_id,
      name,
      category,
      location,
      phone,
      secondary_phone,
      timezone,
      logo_url,
      primary_color,
      welcome_message,
      google_review_url
    ) VALUES (
      v_owner_id,
      'Patna Fried Chicken (PFC)',
      'restaurant',
      'Shop No. 4, Divya Apartment, Near Gold''s Gym, Ashiyana Digha Road, Patna',
      '7091719475',
      NULL,
      'Asia/Kolkata',
      '/pfc-logo.jpg',
      '#e11d48',
      '{"en": "Welcome to Patna Fried Chicken (PFC)! Share your crispy dining experience with us in 30 seconds. For helpline & orders call 7091719475."}'::jsonb,
      'https://search.google.com/local/writereview?placeid=ChIJHxZmNS1X7TkR77HVa1ipTJw'
    )
    RETURNING id INTO v_business_id;
  ELSE
    -- Update existing record with official PFC info
    UPDATE businesses SET
      name = 'Patna Fried Chicken (PFC)',
      location = 'Shop No. 4, Divya Apartment, Near Gold''s Gym, Ashiyana Digha Road, Patna',
      phone = '7091719475',
      secondary_phone = NULL,
      logo_url = '/pfc-logo.jpg',
      primary_color = '#e11d48',
      welcome_message = '{"en": "Welcome to Patna Fried Chicken (PFC)! Share your crispy dining experience with us in 30 seconds. For helpline & orders call 7091719475."}'::jsonb,
      google_review_url = 'https://search.google.com/local/writereview?placeid=ChIJHxZmNS1X7TkR77HVa1ipTJw',
      updated_at = now()
    WHERE id = v_business_id;
  END IF;

  -- 2. Seed default questions
  PERFORM seed_default_questions(v_business_id);

  -- 3. Seed primary campaign: pfc
  INSERT INTO campaigns (business_id, name, slug, active)
  VALUES (v_business_id, 'Table Stands - Dine-In QR (PFC)', 'pfc', true)
  ON CONFLICT (slug) DO UPDATE SET active = true, business_id = v_business_id;

  -- Seed takeaway & counter campaign: patna-fried-chicken
  INSERT INTO campaigns (business_id, name, slug, active)
  VALUES (v_business_id, 'Counter & Takeaway QR', 'patna-fried-chicken', true)
  ON CONFLICT (slug) DO UPDATE SET active = true, business_id = v_business_id;

  -- Keep alias campaign 'pm-zaika' so old bookmarks gracefully resolve
  INSERT INTO campaigns (business_id, name, slug, active)
  VALUES (v_business_id, 'Table Stands - Dine-In QR (Legacy)', 'pm-zaika', true)
  ON CONFLICT (slug) DO UPDATE SET active = true, business_id = v_business_id;

  -- 4. Seed PFC Menu Items
  DELETE FROM menu_items WHERE business_id = v_business_id;

  INSERT INTO menu_items (business_id, name, position, active) VALUES
    (v_business_id, '{"en": "Crispy Fried Chicken (Bucket / Pieces)"}'::jsonb, 1, true),
    (v_business_id, '{"en": "Hot & Spicy Chicken Wings"}'::jsonb, 2, true),
    (v_business_id, '{"en": "PFC Special Zinger Burger"}'::jsonb, 3, true),
    (v_business_id, '{"en": "Peri-Peri Popcorn Chicken"}'::jsonb, 4, true),
    (v_business_id, '{"en": "Crispy Boneless Chicken Strips"}'::jsonb, 5, true),
    (v_business_id, '{"en": "Crispy Chicken Wrap / Roll"}'::jsonb, 6, true),
    (v_business_id, '{"en": "Cheesy Loaded Chicken Fries"}'::jsonb, 7, true),
    (v_business_id, '{"en": "Peri-Peri French Fries"}'::jsonb, 8, true),
    (v_business_id, '{"en": "Chilled Mojito & Cold Beverages"}'::jsonb, 9, true)
  ON CONFLICT DO NOTHING;

END $$;

-- Verify setup output
SELECT id, name, location, phone, primary_color FROM businesses;
