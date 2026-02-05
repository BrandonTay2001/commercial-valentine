-- Initial Schema for Multi-User Valentine's App
-- This creates all tables from scratch for a brand new Supabase project
--
-- Run with: supabase db push
-- or apply manually in Supabase SQL Editor

-- ===================================================================
-- Step 1: Create couples table
-- ===================================================================
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  path TEXT UNIQUE NOT NULL,
  couple_name TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Hero settings (stored as columns, not separate table)
  hero_bg_url TEXT,
  hero_label TEXT DEFAULT 'The Journey of Us',
  hero_title TEXT DEFAULT 'Our Story',
  hero_subtext TEXT DEFAULT '"Every love story is beautiful, but ours is my favorite."',
  hero_blur_amount INTEGER DEFAULT 16,

  -- Map settings
  map_style TEXT DEFAULT 'mapbox://styles/mapbox/light-v11',
  map_zoom_level DOUBLE PRECISION DEFAULT 13,
  map_pitch DOUBLE PRECISION DEFAULT 0,

  -- Footer settings
  footer_title TEXT DEFAULT 'To Forever & Beyond',
  footer_description TEXT DEFAULT 'Built with love and shared memories. May our story continue to unfold in the most beautiful ways.',
  footer_caption TEXT DEFAULT '2026 Valentines'
);

-- Indexes for couples
CREATE INDEX idx_couples_path ON couples(path);
CREATE INDEX idx_couples_user_id ON couples(user_id);
CREATE INDEX idx_couples_is_active ON couples(is_active) WHERE is_active = true;

-- ===================================================================
-- Step 2: Create checkpoints table
-- ===================================================================
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  date_visited DATE
);

-- Indexes for checkpoints
CREATE INDEX idx_checkpoints_couple_id ON checkpoints(couple_id);
CREATE INDEX idx_checkpoints_order ON checkpoints(couple_id, order_index);

-- ===================================================================
-- Step 3: Create memories table
-- ===================================================================
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  note TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Indexes for memories
CREATE INDEX idx_memories_couple_id ON memories(couple_id);
CREATE INDEX idx_memories_checkpoint_id ON memories(checkpoint_id);
CREATE INDEX idx_memories_order ON memories(couple_id, order_index);

-- ===================================================================
-- Step 4: Enable Row Level Security (RLS)
-- ===================================================================
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Step 5: Create RLS Policies
-- ===================================================================

-- Couples table policies

-- Public can view couples by path (for viewing sites)
CREATE POLICY "Public can view couples by path"
  ON couples FOR SELECT
  USING (true);

-- Users can view their own couple
CREATE POLICY "Users can view own couple"
  ON couples FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create a couple
CREATE POLICY "Users can create own couple"
  ON couples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own couple
CREATE POLICY "Users can update own couple"
  ON couples FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checkpoints table policies

-- Public can view checkpoints for any couple (for viewing sites)
CREATE POLICY "Public can view checkpoints"
  ON checkpoints FOR SELECT
  USING (true);

-- Users can manage checkpoints for their couple
CREATE POLICY "Users can manage own checkpoints"
  ON checkpoints FOR ALL
  USING (couple_id IN (SELECT id FROM couples WHERE user_id = auth.uid()))
  WITH CHECK (couple_id IN (SELECT id FROM couples WHERE user_id = auth.uid()));

-- Memories table policies

-- Public can view memories for any couple (for viewing sites)
CREATE POLICY "Public can view memories"
  ON memories FOR SELECT
  USING (true);

-- Users can manage memories for their couple
CREATE POLICY "Users can manage own memories"
  ON memories FOR ALL
  USING (couple_id IN (SELECT id FROM couples WHERE user_id = auth.uid()))
  WITH CHECK (couple_id IN (SELECT id FROM couples WHERE user_id = auth.uid()));

-- ===================================================================
-- Step 6: Create helper function to get user's couple
-- ===================================================================
CREATE OR REPLACE FUNCTION public.get_user_couple()
RETURNS TABLE (id UUID, path TEXT, couple_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.path, c.couple_name
  FROM couples c
  WHERE c.user_id = auth.uid()
    AND c.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- Step 7: Grant permissions
-- ===================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON couples TO anon, authenticated;
GRANT ALL ON checkpoints TO anon, authenticated;
GRANT ALL ON memories TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_couple() TO anon, authenticated;

-- ===================================================================
-- Step 8: Create a demo couple for the landing page showcase
-- ===================================================================
-- This creates a demo couple with path='demo' for the landing page
-- The user_id is NULL since this is a public demo
INSERT INTO couples (
  user_id,
  path,
  couple_name,
  hero_title,
  hero_subtext,
  hero_label,
  footer_title
) VALUES (
  NULL,
  'demo',
  'Demo Couple',
  'Our Love Story',
  'Every location holds a memory',
  'The Journey of Us',
  'To Forever & Beyond'
) ON CONFLICT (path) DO NOTHING;

-- ===================================================================
-- Step 9: Enable storage for image uploads (if not already enabled)
-- ===================================================================
-- Note: You need to create a 'memories' bucket in Supabase Storage
-- This can be done via the Supabase Dashboard or CLI:
-- supabase storage create buckets memories
-- supabase storage set-public memories

-- Optional: Create storage policy for images
-- Allow public access to images
-- CREATE POLICY "Public can view images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'memories');

-- Allow authenticated users to upload images
-- CREATE POLICY "Authenticated can upload images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'memories' AND
--     auth.role() = 'authenticated'
--   );

-- Allow authenticated users to delete images they uploaded
-- CREATE POLICY "Authenticated can delete own images"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'memories' AND
--     auth.role() = 'authenticated'
--   );
