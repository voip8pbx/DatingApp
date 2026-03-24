import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Get credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('CRITICAL: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.');
}

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file'
    );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
