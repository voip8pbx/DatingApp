import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set'
    );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);