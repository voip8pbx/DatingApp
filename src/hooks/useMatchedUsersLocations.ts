import { useEffect, useCallback } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useMatchStore } from '../store/matchStore';
import { supabase } from '../supabase';
import type { MatchedUserLocation } from '../types';

// DEV_MODE mock data for testing
const DEV_MODE = __DEV__;

const MOCK_MATCHED_LOCATIONS: MatchedUserLocation[] = DEV_MODE ? [
    {
        user_id: 'mock-1',
        latitude: 19.0760 + (Math.random() - 0.5) * 0.02,
        longitude: 72.8777 + (Math.random() - 0.5) * 0.02,
        profile: {
            full_name: 'Aanya S.',
            avatar_url: 'https://i.pravatar.cc/150?img=5',
            last_active: new Date().toISOString()
        },
        isOnline: true,
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 'mock-2',
        latitude: 19.0760 + (Math.random() - 0.5) * 0.02,
        longitude: 72.8777 + (Math.random() - 0.5) * 0.02,
        profile: {
            full_name: 'Vihaan K.',
            avatar_url: 'https://i.pravatar.cc/150?img=8',
            last_active: new Date().toISOString()
        },
        isOnline: true,
        updated_at: new Date().toISOString(),
    },
    {
        user_id: 'mock-3',
        latitude: 19.0760 + (Math.random() - 0.5) * 0.02,
        longitude: 72.8777 + (Math.random() - 0.5) * 0.02,
        profile: {
            full_name: 'Saanvi M.',
            avatar_url: 'https://i.pravatar.cc/150?img=9',
            last_active: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        isOnline: false,
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
        user_id: 'mock-4',
        latitude: 19.0760 + (Math.random() - 0.5) * 0.02,
        longitude: 72.8777 + (Math.random() - 0.5) * 0.02,
        profile: {
            full_name: 'Arjun P.',
            avatar_url: 'https://i.pravatar.cc/150?img=12',
            last_active: new Date(Date.now() - 45 * 60 * 1000).toISOString()
        },
        isOnline: false,
        updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
        user_id: 'mock-5',
        latitude: 19.0760 + (Math.random() - 0.5) * 0.02,
        longitude: 72.8777 + (Math.random() - 0.5) * 0.02,
        profile: {
            full_name: 'Myra R.',
            avatar_url: 'https://i.pravatar.cc/150?img=20',
            last_active: new Date().toISOString()
        },
        isOnline: true,
        updated_at: new Date().toISOString(),
    },
] : [];

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

    const { matches } = useMatchStore();

    const fetchMatchedLocations = useCallback(async () => {
        // In DEV_MODE, return mock data
        if (DEV_MODE) {
            // Simulate movement for mock data
            const mockWithMovement = MOCK_MATCHED_LOCATIONS.map(user => ({
                ...user,
                latitude: user.latitude + (Math.random() - 0.5) * 0.0001,
                longitude: user.longitude + (Math.random() - 0.5) * 0.0001,
            }));
            setMatchedLocations(mockWithMovement);
            return;
        }

        try {
            const { data, error: userError } = await supabase.auth.getUser();
            if (userError || !data?.user) return;
            const user = data.user;

            // Get current user's matches
            const matchUserIds = matches.map(match =>
                match.user1_id === user.id ? match.user2_id : match.user1_id
            );

            if (matchUserIds.length === 0) {
                setMatchedLocations([]);
                return;
            }

            // Fetch locations of matched users
            const { data: locations, error } = await supabase
                .from('user_locations')
                .select(`
                    user_id,
                    latitude,
                    longitude,
                    heading,
                    updated_at,
                    profile:profiles(
                        full_name,
                        avatar_url,
                        last_active
                    )
                `)
                .in('user_id', matchUserIds)
                .gt('updated_at', new Date(Date.now() - LOCATION_HIDDEN_THRESHOLD).toISOString());

            if (error) {
                console.error('Error fetching matched locations:', error);
                return;
            }

            if (!locations) return;

            // Transform and filter locations
            const now = Date.now();
            const transformedLocations: MatchedUserLocation[] = locations
                .filter((loc: any) => {
                    const updatedAt = new Date(loc.updated_at).getTime();
                    return (now - updatedAt) < LOCATION_HIDDEN_THRESHOLD;
                })
                .map((loc: any) => ({
                    user_id: loc.user_id,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    heading: loc.heading,
                    updated_at: loc.updated_at,
                    profile: {
                        full_name: loc.profile?.full_name || 'Unknown',
                        avatar_url: loc.profile?.avatar_url || '',
                        last_active: loc.profile?.last_active || loc.updated_at,
                    },
                    isOnline: (now - new Date(loc.updated_at).getTime()) < LOCATION_STALE_THRESHOLD,
                }));

            setMatchedLocations(transformedLocations);
        } catch (error) {
            console.error('Error in fetchMatchedLocations:', error);
        }
    }, [matches, setMatchedLocations]);

    const handleLocationChange = useCallback((payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const updatedAt = new Date(newRecord.updated_at).getTime();
            const now = Date.now();

            // Don't show locations older than 60 minutes
            if ((now - updatedAt) >= LOCATION_HIDDEN_THRESHOLD) {
                return;
            }

            // Check if this user is actually a match
            const matchUserIds = matches.map(match =>
                match.user1_id === newRecord.user_id || match.user2_id === newRecord.user_id
            );

            if (!matchUserIds.includes(true)) {
                return;
            }

            // Fetch the profile for this location
            supabase
                .from('profiles')
                .select('full_name, avatar_url, last_active')
                .eq('id', newRecord.user_id)
                .single()
                .then(({ data: profile }) => {
                    if (profile) {
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
    }, [matches, upsertMatchedLocation, removeMatchedLocation]);

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
