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
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
    new.raw_user_meta_data->>'avatar_url', 
    -- Generate a default unique username from email prefix + random suffix
    LOWER(SPLIT_PART(new.email, '@', 1)) || '_' || SUBSTRING(gen_random_uuid()::text, 1, 4),
    NOW(),
    NOW(),
    true,
    false,
    false
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error or handle gracefully
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================================
-- SCHEMA MIGRATION COMPLETE
-- =============================================================================
SELECT 'Vibe Dating App schema migration completed successfully!' AS status;
