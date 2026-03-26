-- =============================================================================
-- Vibe Dating App - Enhanced Schema with Match Detection
-- Run this in your Supabase SQL Editor
-- This migration preserves existing data while adding new features
-- =============================================================================

-- =============================================================================
-- PHOTO HISTORY TABLE (for tracking photo changes and cleanup)
-- =============================================================================
CREATE TABLE IF NOT EXISTS photo_history (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references profiles(id) on delete cascade not null,
    photo_url text not null,
    photo_type text check (photo_type in ('avatar', 'profile_photo')) not null,
    is_deleted boolean default false,
    deleted_at timestamptz,
    created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE photo_history enable row level security;

-- RLS Policies for photo_history
DROP POLICY IF EXISTS "Users can view own photo history" ON photo_history;
CREATE POLICY "Users can view own photo history" ON photo_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own photo history" ON photo_history;
CREATE POLICY "Users can insert own photo history" ON photo_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own photo history" ON photo_history;
CREATE POLICY "Users can update own photo history" ON photo_history FOR UPDATE USING (auth.uid() = user_id);

-- Index for photo_history
CREATE INDEX IF NOT EXISTS idx_photo_history_user ON photo_history(user_id);

-- =============================================================================
-- FUNCTION TO CLEANUP ORPHANED PHOTOS
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_photos()
RETURNS void AS $$
DECLARE
    orphaned_photo record;
    photo_path text;
BEGIN
    FOR orphaned_photo IN
        SELECT ph.id, ph.photo_url, ph.user_id
        FROM photo_history ph
        WHERE ph.is_deleted = true
        AND ph.deleted_at IS NOT NULL
        AND ph.deleted_at < NOW() - INTERVAL '1 day'
    LOOP
        photo_path := SPLIT_PART(orphaned_photo.photo_url, '/storage/v1/object/public/profiles/', 2);
        
        IF photo_path IS NOT NULL THEN
            BEGIN
                DELETE FROM storage.objects 
                WHERE bucket_id = 'profiles' 
                AND name = photo_path;
                
                DELETE FROM photo_history WHERE id = orphaned_photo.id;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to cleanup photo: %', orphaned_photo.photo_url;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION TO TRACK PHOTO DELETION
-- =============================================================================

CREATE OR REPLACE FUNCTION track_photo_deletion()
RETURNS TRIGGER AS $$
DECLARE
    photo text;
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.profile_photos IS DISTINCT FROM NEW.profile_photos OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) THEN
        
        IF OLD.profile_photos IS NOT NULL AND NEW.profile_photos IS NOT NULL THEN
            FOR photo IN SELECT unnest(OLD.profile_photos) EXCEPT SELECT unnest(NEW.profile_photos)
            LOOP
                INSERT INTO photo_history (user_id, photo_url, photo_type, is_deleted, deleted_at)
                VALUES (NEW.id, photo, 'profile_photo', true, NOW())
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
        
        IF OLD.avatar_url IS NOT NULL AND NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
            INSERT INTO photo_history (user_id, photo_url, photo_type, is_deleted, deleted_at)
            VALUES (NEW.id, OLD.avatar_url, 'avatar', true, NOW())
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF NEW.profile_photos IS NOT NULL THEN
            FOR photo IN SELECT unnest(NEW.profile_photos)
            LOOP
                INSERT INTO photo_history (user_id, photo_url, photo_type, is_deleted)
                VALUES (NEW.id, photo, 'profile_photo', false)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
        
        IF NEW.avatar_url IS NOT NULL THEN
            INSERT INTO photo_history (user_id, photo_url, photo_type, is_deleted)
            VALUES (NEW.id, NEW.avatar_url, 'avatar', false)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo tracking
DROP TRIGGER IF EXISTS track_photo_changes ON profiles;
CREATE TRIGGER track_photo_changes
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE track_photo_deletion();

-- =============================================================================
-- MATCH DETECTION FUNCTION
-- Automatically creates a match when mutual likes are detected
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_like()
RETURNS TRIGGER AS $$
DECLARE
    existing_like record;
    matched_match record;
BEGIN
    -- Only process 'like' and 'superlike' directions
    IF NEW.direction NOT IN ('like', 'superlike') THEN
        RETURN NEW;
    END IF;

    -- Check if the person we liked has already liked us (mutual like)
    SELECT * INTO existing_like
    FROM swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('like', 'superlike')
    LIMIT 1;

    -- If mutual like exists, create a match
    IF FOUND THEN
        -- Check if match already exists (prevent duplicates)
        SELECT * INTO matched_match
        FROM matches
        WHERE (user1_id = NEW.swiper_id AND user2_id = NEW.swiped_id)
           OR (user1_id = NEW.swiped_id AND user2_id = NEW.swiper_id)
        LIMIT 1;

        IF NOT FOUND THEN
            -- Create new match
            INSERT INTO matches (user1_id, user2_id, is_active)
            VALUES (NEW.swiper_id, NEW.swiped_id, true)
            RETURNING * INTO matched_match;
            
            RAISE NOTICE 'Match created between % and %', NEW.swiper_id, NEW.swiped_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic match detection
DROP TRIGGER IF EXISTS trigger_handle_like ON swipes;
CREATE TRIGGER trigger_handle_like
    AFTER INSERT ON swipes
    FOR EACH ROW
    EXECUTE PROCEDURE handle_like();

-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- Index for finding mutual likes (for match detection)
CREATE INDEX IF NOT EXISTS idx_swipes_mutual_lookup ON swipes(swiper_id, direction) 
    WHERE direction IN ('like', 'superlike');

-- Index for sorting matches by most recent
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- Index for active matches
CREATE INDEX IF NOT EXISTS idx_matches_active ON matches(is_active) WHERE is_active = true;

-- =============================================================================
-- STORAGE POLICIES (if not already exists)
-- =============================================================================

-- Allow public read access to profiles bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
    END IF;
END $$;

-- Allow authenticated users to upload
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT 
        WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- Allow users to update their own images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own images' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Users can update their own images" ON storage.objects FOR UPDATE 
        USING (bucket_id = 'profiles' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- Allow users to delete their own images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own images' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE 
        USING (bucket_id = 'profiles' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- =============================================================================
-- SCHEMA MIGRATION COMPLETE
-- =============================================================================
SELECT 'Vibe Dating App schema enhanced with match detection!' AS status;
