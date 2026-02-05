-- Migration: Add address to checkpoints and him/her notes to memories
-- Date: 2025-02-06

-- ===================================================================
-- Step 1: Add address column to checkpoints table
-- ===================================================================
ALTER TABLE checkpoints 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add a marker_label column if it doesn't exist (used in UI)
ALTER TABLE checkpoints 
ADD COLUMN IF NOT EXISTS marker_label TEXT;

-- ===================================================================
-- Step 2: Add him/her notes to memories table
-- ===================================================================

-- Add the new note columns
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS note_him TEXT;

ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS note_her TEXT;

-- Migrate existing note data to note_him (optional - preserves existing notes)
UPDATE memories 
SET note_him = note 
WHERE note IS NOT NULL AND note_him IS NULL;

-- Drop the old note column (uncomment when ready to remove)
-- ALTER TABLE memories DROP COLUMN IF EXISTS note;

-- ===================================================================
-- Step 3: Add comment for documentation
-- ===================================================================
COMMENT ON COLUMN checkpoints.address IS 'Human-readable address for the location';
COMMENT ON COLUMN checkpoints.marker_label IS 'Short label displayed on map marker';
COMMENT ON COLUMN memories.note_him IS 'His perspective/note on this memory';
COMMENT ON COLUMN memories.note_her IS 'Her perspective/note on this memory';
