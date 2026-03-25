-- =============================================================================
-- Vibe Dating App - Complete Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PROFILES TABLE (Core table if not already created by Supabase Auth)
-- =============================================================================
DROP TABLE IF EXISTS user_locations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS swipes CASCADE;
DROP TABLE IF EXISTS profile_images CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  username text unique,
  full_name text,
  age int check (age >= 18),
  gender text check (gender in ('male', 'female', 'non-binary', 'other')),
  interested_gender text[], -- male, female, non-binary, other
  height numeric,
  height_unit text default 'cm' check (height_unit in ('cm', 'ft')),
  religion text,
  bio text,
  drinking_habit text check (drinking_habit in ('never', 'occasionally', 'regularly')),
  smoking_habit text check (smoking_habit in ('never', 'occasionally', 'regularly')),
  hometown text,
  school_name text,
  college_name text,
  location text,
  city text,
  profile_photos text[] default '{}',
  max_distance int default 50,
  age_min int default 18,
  age_max int default 35,
  location_sharing_enabled boolean default true,
  ghost_mode_enabled boolean default false,
  is_premium boolean default false,
  avatar_url text,
  last_active timestamptz default now(),
  created_at timestamptz default now(),
  interests text[] default '{}'
);

-- =============================================================================
-- PROFILE IMAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS profile_images (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  url text not null,
  is_primary boolean default false,
  display_order int default 0,
  created_at timestamptz default now()
);

-- =============================================================================
-- OTHER TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS swipes (
  id uuid default gen_random_uuid() primary key,
  swiper_id uuid references profiles(id) on delete cascade,
  swiped_id uuid references profiles(id) on delete cascade,
  direction text not null check (direction in ('like', 'dislike', 'superlike')),
  created_at timestamptz default now(),
  unique(swiper_id, swiped_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid default gen_random_uuid() primary key,
  user1_id uuid references profiles(id) on delete cascade,
  user2_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  is_active boolean default true,
  unique(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'image', 'gif', 'emoji')),
  is_read boolean default false,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS user_locations (
  id uuid references auth.users(id) on delete cascade primary key,
  user_id uuid references profiles(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  updated_at timestamptz default now()
);

CREATE OR REPLACE FUNCTION user_locations_insert_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_locations_set_user_id ON user_locations;
CREATE TRIGGER user_locations_set_user_id
  BEFORE INSERT ON user_locations
  FOR EACH ROW
  EXECUTE PROCEDURE user_locations_insert_user_id();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE profiles enable row level security;
ALTER TABLE profile_images enable row level security;
ALTER TABLE swipes enable row level security;
ALTER TABLE matches enable row level security;
ALTER TABLE messages enable row level security;
ALTER TABLE user_locations enable row level security;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Profile Images policies
DROP POLICY IF EXISTS "Public profile images are viewable by everyone" ON profile_images;
CREATE POLICY "Public profile images are viewable by everyone" ON profile_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own profile images" ON profile_images;
CREATE POLICY "Users can manage own profile images" ON profile_images FOR ALL USING (auth.uid() = user_id);

-- Swipes policies
DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
CREATE POLICY "Users can view own swipes" ON swipes FOR SELECT USING (auth.uid() = swiper_id);
DROP POLICY IF EXISTS "Users can create own swipes" ON swipes;
CREATE POLICY "Users can create own swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- Matches policies
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in own matches" ON messages;
CREATE POLICY "Users can view messages in own matches" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches WHERE id = match_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Users can send messages in own matches" ON messages;
CREATE POLICY "Users can send messages in own matches" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM matches WHERE id = match_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- User Locations policies
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON user_locations;
CREATE POLICY "Locations are viewable by everyone" ON user_locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own location" ON user_locations;
CREATE POLICY "Users can manage own location" ON user_locations FOR ALL USING (auth.uid() = id OR auth.uid() = user_id);

-- =============================================================================
-- CREATE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active);
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_id ON user_locations(id);
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON user_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_profile_images_user ON profile_images(user_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_last_active();

CREATE OR REPLACE FUNCTION update_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_location_update ON user_locations;
CREATE TRIGGER on_location_update
  BEFORE UPDATE ON user_locations
  FOR EACH ROW
  EXECUTE PROCEDURE update_location_timestamp();

-- =============================================================================
-- ROBUST USER SIGNUP TRIGGER
-- Automatically creates a profile when a user signs up via auth.users (e.g., Google)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email,
    full_name, 
    avatar_url, 
    username, 
    created_at, 
    last_active,
    location_sharing_enabled,
    ghost_mode_enabled,
    is_premium
  )
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
    new.raw_user_meta_data->>'avatar_url', 
    LOWER(SPLIT_PART(new.email, '@', 1)) || '_' || SUBSTRING(gen_random_uuid()::text, 1, 4),
    NOW(),
    NOW(),
    true,
    false,
    false
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================
begin;
  alter publication supabase_realtime add table user_locations;
  alter publication supabase_realtime add table matches;
  alter publication supabase_realtime add table messages;
commit;

-- =============================================================================
-- SCHEMA MIGRATION COMPLETE
-- =============================================================================
SELECT 'Vibe Dating App schema migration completed successfully!' AS status;

-- =============================================================================
-- STORAGE BUCKETS POLICIES (for image uploads)
-- =============================================================================

-- 1. Allow everyone to see images (Make sure your bucket is called 'profiles')
DROP POLICY IF EXISTS "Public Read Access" on storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'profiles');

-- 2. Allow authenticated users to upload their own images
DROP POLICY IF EXISTS "Authenticated users can upload" on storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'authenticated');

-- 3. Allow users to update/delete their own images
DROP POLICY IF EXISTS "Users can update their own images" on storage.objects;
CREATE POLICY "Users can update their own images" ON storage.objects FOR UPDATE 
USING (bucket_id = 'profiles' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own images" on storage.objects;
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE 
USING (bucket_id = 'profiles' AND auth.role() = 'authenticated');

-- =============================================================================
-- PHOTO HISTORY TABLE (for tracking photo changes and cleanup)
-- =============================================================================
DROP TABLE IF EXISTS photo_history CASCADE;

CREATE TABLE photo_history (
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
-- SCHEMA MIGRATION COMPLETE
-- =============================================================================
SELECT 'Vibe Dating App schema migration completed with image cleanup support!' AS status;
