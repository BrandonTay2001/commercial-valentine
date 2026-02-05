-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Create checkpoints table
CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    date TEXT,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    zoom DOUBLE PRECISION DEFAULT 13,
    order_index INTEGER DEFAULT 0
);

-- 2. Create memories table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    checkpoint_id UUID REFERENCES checkpoints(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    note_him TEXT,
    note_her TEXT,
    order_index INTEGER DEFAULT 0
);

-- 3. Enable RLS
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Public Read, All for everyone for now to make it easy)
-- Note: In a real app, you'd use Auth, but for a simple microsite this works.
CREATE POLICY "Allow Public read" ON checkpoints FOR SELECT USING (true);
CREATE POLICY "Allow Public read" ON memories FOR SELECT USING (true);
CREATE POLICY "Allow All for now" ON checkpoints FOR ALL USING (true);
CREATE POLICY "Allow All for now" ON memories FOR ALL USING (true);

-- 5. Storage Policies (If bucket 'memories' exists)
-- This allows anyone to upload and read images.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Memories Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'memories');
CREATE POLICY "Memories All Access" ON storage.objects FOR ALL USING (bucket_id = 'memories');

-- 6. Insert Initial Demo Data
INSERT INTO checkpoints (title, date, description, latitude, longitude, zoom, order_index)
VALUES 
('Where It Started', 'July 2023', 'The coffee shop where I spilled my latte.', 48.8566, 2.3522, 13, 1),
('First Adventure', 'December 2023', 'Lost in Shibuya with no map, just us.', 35.6762, 139.6503, 12, 2),
('The Big Yes', 'Feb 2025', 'Under the stars, you said forever.', -8.7185, 115.1764, 14, 3);
