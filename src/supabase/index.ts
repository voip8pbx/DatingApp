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

// Robust manual Base64 to ArrayBuffer converter (avoiding atob/fetch issues in RN)
const base64ToBuffer = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes = new Uint8Array(Math.floor(base64.length * 0.75));
    let i, j = 0, p = 0, enc1, enc2, enc3, enc4;

    for (i = 0; i < base64.length; i += 4) {
        enc1 = chars.indexOf(base64[i]);
        enc2 = chars.indexOf(base64[i + 1]);
        enc3 = chars.indexOf(base64[i + 2]);
        enc4 = chars.indexOf(base64[i + 3]);

        bytes[p++] = (enc1 << 2) | (enc2 >> 4);
        if (enc3 !== 64 && enc3 !== -1) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
        if (enc4 !== 64 && enc4 !== -1) bytes[p++] = ((enc3 & 3) << 6) | (enc4 & 63);
    }
    return bytes.buffer;
};

// Upload profile image to Supabase Storage
export const uploadProfileImage = async (userId: string, imageUri: string, base64Data?: string) => {
    try {
        console.log('Starting upload for user:', userId);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const fileName = `${userId}/${Date.now()}.jpg`;
        const fileType = imageUri.split('.').pop()?.toLowerCase();

        let fileBody: any;
        if (base64Data) {
            console.log('Using Base64 data for upload...');
            fileBody = base64ToBuffer(base64Data);
        } else {
            console.log('No Base64 data, falling back to fetch (might fail on Android)...');
            const response = await fetch(imageUri);
            fileBody = await response.blob();
        }

        console.log('Uploading to Supabase bucket...');
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKETS.PROFILES)
            .upload(fileName, fileBody, {
                contentType: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('Supabase Storage Error:', error);
            throw error;
        }

        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKETS.PROFILES)
            .getPublicUrl(fileName);

        console.log('Upload successful:', urlData.publicUrl);
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

// ============================================================================
// IMAGE CLEANUP FUNCTIONS
// ============================================================================

/**
 * Extracts the file path from a Supabase Storage URL
 * @param url - Full storage URL
 * @returns File path relative to bucket
 */
export const extractStoragePath = (url: string): string | null => {
    try {
        // Pattern: https://[project].supabase.co/storage/v1/object/public/profiles/userId/filename
        const pathPattern = /\/storage\/v1\/object\/public\/profiles\/(.+)$/;
        const match = url.match(pathPattern);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error extracting storage path:', error);
        return null;
    }
};

/**
 * Compares current photos with previous photos to find removed images
 * @param currentPhotos - Array of current photo URLs
 * @param previousPhotos - Array of previous photo URLs
 * @returns Array of removed photo URLs
 */
export const findRemovedPhotos = (currentPhotos: string[], previousPhotos: string[]): string[] => {
    if (!previousPhotos || previousPhotos.length === 0) {
        return [];
    }

    if (!currentPhotos || currentPhotos.length === 0) {
        // All photos were removed
        return previousPhotos;
    }

    // Find photos in previous but not in current
    return previousPhotos.filter(prevPhoto =>
        !currentPhotos.some(currPhoto => {
            // Compare by extracting storage paths or full URL
            const prevPath = extractStoragePath(prevPhoto) || prevPhoto;
            const currPath = extractStoragePath(currPhoto) || currPhoto;
            return prevPath === currPath || prevPhoto === currPhoto;
        })
    );
};

/**
 * Deletes images from Supabase Storage
 * @param imageUrls - Array of image URLs to delete
 * @returns Promise<{success: string[], failed: string[]}> - Results of deletion
 */
export const deleteImagesFromStorage = async (imageUrls: string[]): Promise<{ success: string[], failed: string[] }> => {
    const success: string[] = [];
    const failed: string[] = [];

    for (const url of imageUrls) {
        try {
            const path = extractStoragePath(url);
            if (!path) {
                console.warn('Could not extract path from URL:', url);
                failed.push(url);
                continue;
            }

            // Check if it's an external URL (not from Supabase storage)
            if (url.includes('supabase.co')) {
                const { error } = await supabase.storage
                    .from(STORAGE_BUCKETS.PROFILES)
                    .remove([path]);

                if (error) {
                    console.error('Error deleting image:', error);
                    failed.push(url);
                } else {
                    console.log('Successfully deleted:', path);
                    success.push(url);
                }
            } else {
                // External URL - can't delete from Supabase storage
                console.log('External URL (not from Supabase), skipping deletion:', url);
                success.push(url); // Consider it "deleted" from our perspective
            }
        } catch (error) {
            console.error('Exception deleting image:', error);
            failed.push(url);
        }
    }

    return { success, failed };
};

/**
 * Updates user profile photos with automatic cleanup of removed images
 * @param userId - User ID
 * @param newPhotos - New array of photo URLs
 * @param previousPhotos - Previous array of photo URLs (for comparison)
 * @returns Updated profile
 */
export const updateProfilePhotos = async (
    userId: string,
    newPhotos: string[],
    previousPhotos: string[]
) => {
    try {
        // First, find and delete removed photos from storage
        const removedPhotos = findRemovedPhotos(newPhotos, previousPhotos);

        if (removedPhotos.length > 0) {
            console.log('Cleaning up removed photos:', removedPhotos);
            const deletionResult = await deleteImagesFromStorage(removedPhotos);
            console.log('Cleanup result:', deletionResult);

            if (deletionResult.failed.length > 0) {
                console.warn('Some photos could not be deleted:', deletionResult.failed);
            }
        }

        // Update the profile with new photos
        const { data, error } = await supabase
            .from('profiles')
            .update({ profile_photos: newPhotos })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        console.log('Profile photos updated successfully');
        return data;
    } catch (error) {
        console.error('Error updating profile photos:', error);
        throw error;
    }
};

/**
 * Updates avatar with cleanup of old avatar
 * @param userId - User ID
 * @param newAvatarUrl - New avatar URL
 * @param previousAvatarUrl - Previous avatar URL (optional)
 * @returns Updated profile
 */
export const updateProfileAvatar = async (
    userId: string,
    newAvatarUrl: string,
    previousAvatarUrl?: string | null
) => {
    try {
        // Delete old avatar if it exists and is from Supabase storage
        if (previousAvatarUrl && previousAvatarUrl.includes('supabase.co')) {
            const path = extractStoragePath(previousAvatarUrl);
            if (path) {
                await supabase.storage
                    .from(STORAGE_BUCKETS.PROFILES)
                    .remove([path]);
                console.log('Old avatar deleted:', path);
            }
        }

        // Update profile with new avatar
        const { data, error } = await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        console.log('Profile avatar updated successfully');
        return data;
    } catch (error) {
        console.error('Error updating profile avatar:', error);
        throw error;
    }
};

/**
 * Full profile update with photo cleanup - handles both avatar and profile_photos
 * @param userId - User ID
 * @param updates - Profile updates (profile_photos, avatar_url, etc.)
 * @param previousProfile - Previous profile state for comparison
 * @returns Updated profile
 */
export const updateProfileWithCleanup = async (
    userId: string,
    updates: {
        profile_photos?: string[];
        avatar_url?: string;
        [key: string]: any;
    },
    previousProfile: {
        profile_photos?: string[];
        avatar_url?: string | null;
        [key: string]: any;
    }
) => {
    try {
        // Handle profile_photos cleanup
        if (updates.profile_photos && previousProfile.profile_photos) {
            const removedPhotos = findRemovedPhotos(
                updates.profile_photos,
                previousProfile.profile_photos
            );

            if (removedPhotos.length > 0) {
                console.log('Cleaning up removed photos:', removedPhotos);
                await deleteImagesFromStorage(removedPhotos);
            }
        }

        // Handle avatar cleanup
        if (updates.avatar_url && previousProfile.avatar_url) {
            if (updates.avatar_url !== previousProfile.avatar_url) {
                // Avatar changed - delete old one
                if (previousProfile.avatar_url.includes('supabase.co')) {
                    const path = extractStoragePath(previousProfile.avatar_url);
                    if (path) {
                        await supabase.storage
                            .from(STORAGE_BUCKETS.PROFILES)
                            .remove([path]);
                        console.log('Old avatar deleted during profile update');
                    }
                }
            }
        }

        // Perform the profile update
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        console.log('Profile updated with cleanup successfully');
        return data;
    } catch (error) {
        console.error('Error in updateProfileWithCleanup:', error);
        throw error;
    }
};

// ============================================================================
// MATCH DETECTION FUNCTIONS
// ============================================================================

export interface SwipeResult {
    success: boolean;
    matched: boolean;
    matchId?: string;
    error?: string;
}

/**
 * Records a swipe (like/dislike/superlike) and checks for mutual match
 * @param swiperId - Current user's ID
 * @param swipedId - Profile being swiped on
 * @param direction - like, dislike, or superlike
 * @returns SwipeResult with match information
 */
export const recordSwipe = async (
    swiperId: string,
    swipedId: string,
    direction: 'like' | 'dislike' | 'superlike'
): Promise<SwipeResult> => {
    try {
        // First, insert the swipe
        const { data: swipeData, error: swipeError } = await supabase
            .from('swipes')
            .upsert({
                swiper_id: swiperId,
                swiped_id: swipedId,
                direction: direction,
            }, {
                onConflict: 'swiper_id,swiped_id'
            })
            .select()
            .single();

        if (swipeError) {
            console.error('Error recording swipe:', swipeError);
            return { success: false, matched: false, error: swipeError.message };
        }

        // Only check for match on like/superlike
        if (direction === 'dislike') {
            return { success: true, matched: false };
        }

        // Check if the other user has already liked us (mutual like)
        const { data: mutualLike, error: mutualError } = await supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', swipedId)
            .eq('swiped_id', swiperId)
            .in('direction', ['like', 'superlike'])
            .single();

        if (mutualError && mutualError.code !== 'PGRST116') {
            console.error('Error checking mutual like:', mutualError);
            return { success: true, matched: false };
        }

        // If mutual like exists, check if match already exists
        if (mutualLike) {
            const { data: existingMatch, error: matchError } = await supabase
                .from('matches')
                .select('id')
                .or(`and(user1_id.eq.${swiperId},user2_id.eq.${swipedId}),and(user1_id.eq.${swipedId},user2_id.eq.${swiperId})`)
                .single();

            if (matchError && matchError.code !== 'PGRST116') {
                console.error('Error checking existing match:', matchError);
            }

            // If no existing match, create one
            if (!existingMatch) {
                const { data: newMatch, error: createMatchError } = await supabase
                    .from('matches')
                    .insert({
                        user1_id: swiperId,
                        user2_id: swipedId,
                        is_active: true,
                    })
                    .select()
                    .single();

                if (createMatchError) {
                    console.error('Error creating match:', createMatchError);
                    return { success: true, matched: false, error: createMatchError.message };
                }

                console.log('Match created:', newMatch?.id);
                return { success: true, matched: true, matchId: newMatch?.id };
            }

            return { success: true, matched: true, matchId: existingMatch?.id };
        }

        return { success: true, matched: false };
    } catch (error: any) {
        console.error('Error in recordSwipe:', error);
        return { success: false, matched: false, error: error.message };
    }
};

/**
 * Fetches all matches for a user with their profile data
 * @param userId - Current user's ID
 * @returns Array of matches with other user profiles
 */
export const fetchMatches = async (userId: string) => {
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('*')
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching matches:', error);
            throw error;
        }

        if (!matches || matches.length === 0) {
            return [];
        }

        // Fetch other user profiles for each match
        const matchesWithProfiles = await Promise.all(
            matches.map(async (match) => {
                const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', otherUserId)
                    .single();

                return {
                    ...match,
                    other_user: profile,
                };
            })
        );

        return matchesWithProfiles;
    } catch (error) {
        console.error('Error in fetchMatches:', error);
        throw error;
    }
};

/**
 * Subscribes to new matches in real-time
 * @param userId - Current user's ID
 * @param onNewMatch - Callback when a new match is created
 * @returns Unsubscribe function
 */
export const subscribeToNewMatches = (
    userId: string,
    onNewMatch: (match: any) => void
) => {
    const channel = supabase
        .channel('new-matches')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'matches',
                filter: `user1_id=eq.${userId}`,
            },
            (payload) => {
                onNewMatch(payload.new);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'matches',
                filter: `user2_id=eq.${userId}`,
            },
            (payload) => {
                onNewMatch(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export default supabase;
