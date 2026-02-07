-- Update default map style to dark mode
-- Run with: supabase db push

ALTER TABLE couples
  ALTER COLUMN map_style SET DEFAULT 'mapbox://styles/mapbox/dark-v11';
