-- Migration: Update map default settings
-- Changes map_zoom_level default from 13 to 4
-- Changes map_pitch default from 0 to 30

ALTER TABLE couples
  ALTER COLUMN map_zoom_level SET DEFAULT 4;

ALTER TABLE couples
  ALTER COLUMN map_pitch SET DEFAULT 30;
