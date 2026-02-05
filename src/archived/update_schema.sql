-- Run this in your Supabase SQL Editor to update the database schema

-- 1. Add blur setting to site_settings
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS hero_blur_amount INTEGER DEFAULT 16;

-- 2. Add marker_label to checkpoints (for custom short labels on map pins)
ALTER TABLE checkpoints 
ADD COLUMN IF NOT EXISTS marker_label TEXT;
