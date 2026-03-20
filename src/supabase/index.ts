import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Your Supabase project credentials
const supabaseConfig = {
    // Your Supabase project URL
    url: SUPABASE_URL,

    // Your Supabase anon key (public key)
    anonKey: SUPABASE_ANON_KEY,
};

// For development, use mock data instead of real Supabase
// Set to false to use real Supabase backend
export const DEV_MODE = true;

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export const getSupabase = () => supabase;

// Storage buckets
export const STORAGE_BUCKETS = {
    PROFILES: 'profiles',
};

// Helper to get storage URL
export const getStorageUrl = (bucket: string, path: string) => {
    return `${supabaseConfig.url}/storage/v1/object/public/${bucket}/${path}`;
};

// Upload profile image
export const uploadProfileImage = async (userId: string, imageUri: string) => {
    const fileName = `${userId}/${Date.now()}.jpg`;
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.PROFILES)
        .upload(fileName, blob);

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.PROFILES)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
};

// Real-time subscriptions
export const subscribeToMessages = (
    matchId: string,
    callback: (payload: any) => void
) => {
    return supabase
        .channel(`messages:${matchId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `match_id=eq.${matchId}`,
            },
            callback
        )
        .subscribe();
};

export const subscribeToMatches = (
    userId: string,
    callback: (payload: any) => void
) => {
    return supabase
        .channel(`matches:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'matches',
                filter: `user1_id=eq.${userId}`,
            },
            callback
        )
        .subscribe();
};

export const subscribeToPresence = (
    channelName: string,
    userId: string,
    onSync: (state: any) => void
) => {
    const channel = supabase.channel(channelName);

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            onSync(state);
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user_id: userId, online_at: new Date().toISOString() });
            }
        });

    return channel;
};

export default supabase;
