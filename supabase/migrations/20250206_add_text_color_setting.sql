-- Migration: Add text color setting for hero and footer sections
-- Date: 2025-02-06

-- ===================================================================
-- Step 1: Add text_color column to couples table
-- ===================================================================
ALTER TABLE couples 
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT 'white';

-- ===================================================================
-- Step 2: Add comment for documentation
-- ===================================================================
COMMENT ON COLUMN couples.text_color IS 'Text color for hero and footer sections: white or black';
