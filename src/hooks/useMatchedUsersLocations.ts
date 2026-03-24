import { useEffect, useCallback } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabase';
import { Config } from '../constants/Config';
import type { MatchedUserLocation } from '../types';

// DEV_MODE mock data for testing
const DEV_MODE = false;

const MOCK_MATCHED_LOCATIONS: MatchedUserLocation[] = [];

const LOCATION_STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const LOCATION_HIDDEN_THRESHOLD = 60 * 60 * 1000; // 60 minutes

export const useMatchedUsersLocations = () => {
    const {
        matchedLocations,
        upsertMatchedLocation,
        removeMatchedLocation,
        setMatchedLocations,
        currentLocation
    } = useLocationStore();

    const { user: currentUser } = useAuthStore();

    const fetchMatchedLocations = useCallback(async () => {
        // In DEV_MODE, return mock data
        if (DEV_MODE) {
            return;
        }

        try {
            // Fetch all active locations from our API
            const response = await fetch(`${Config.API_URL}/api/locations/active`, {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            });
            
            const result = await response.json();

            if (result.locations) {
                setMatchedLocations(result.locations);
            }
        } catch (error) {
            console.error('Error in fetchMatchedLocations:', error);
        }
    }, [setMatchedLocations]);

    const handleLocationChange = useCallback((payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
            // Ignore ourselves as MapScreen shows current user via showsUserLocation={true}
            if (currentUser && newRecord.user_id === currentUser.id) {
                return;
            }
            
            const updatedAt = new Date(newRecord.updated_at).getTime();
            const now = Date.now();

            // Don't show locations older than 60 minutes
            if ((now - updatedAt) >= LOCATION_HIDDEN_THRESHOLD) {
                return;
            }

            // Fetch the profile for this location
            supabase
                .from('profiles')
                .select('full_name, avatar_url, last_active, location_sharing_enabled')
                .eq('id', newRecord.user_id)
                .single()
                .then(({ data: profile }) => {
                    if (profile && profile.location_sharing_enabled) {
                        upsertMatchedLocation({
                            user_id: newRecord.user_id,
                            latitude: newRecord.latitude,
                            longitude: newRecord.longitude,
                            heading: newRecord.heading,
                            updated_at: newRecord.updated_at,
                            profile: {
                                full_name: profile.full_name,
                                avatar_url: profile.avatar_url || '',
                                last_active: profile.last_active,
                            },
                            isOnline: (now - updatedAt) < LOCATION_STALE_THRESHOLD,
                        });
                    }
                });
        } else if (eventType === 'DELETE') {
            removeMatchedLocation(oldRecord.user_id);
        }
    }, [upsertMatchedLocation, removeMatchedLocation]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (DEV_MODE) {
            // In dev mode, simulate location updates
            const interval = setInterval(() => {
                fetchMatchedLocations();
            }, 5000);

            return () => clearInterval(interval);
        }

        const channel = supabase
            .channel('matched-locations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_locations',
                },
                handleLocationChange
            )
            .subscribe();

        // Initial fetch
        fetchMatchedLocations();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchMatchedLocations, handleLocationChange]);

    return {
        matchedLocations,
        refresh: fetchMatchedLocations,
    };
};

export default useMatchedUsersLocations;
