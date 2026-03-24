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
// Set to false or use __DEV__ to use real/mock Supabase backend
export const DEV_MODE = __DEV__;

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

// Upload profile image to Supabase Storage
export const uploadProfileImage = async (userId: string, imageUri: string) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const fileName = `${userId}/${Date.now()}.jpg`;
        
        // Convert to Blob for upload
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKETS.PROFILES)
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Upload error detail:', error);
            throw error;
        }

        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKETS.PROFILES)
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error in uploadProfileImage:', error);
        throw error;
    }
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
