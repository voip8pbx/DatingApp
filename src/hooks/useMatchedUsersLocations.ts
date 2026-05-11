import { useEffect, useCallback, useRef } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabase';
import type { MatchedUserLocation } from '../types';
import { useMockUsersLocations } from './useMockUsersLocations';

// DEV_MODE mock data for testing
const DEV_MODE = false;

const LOCATION_STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const LOCATION_HIDDEN_THRESHOLD = 30 * 60 * 1000; // 30 minutes

export const useMatchedUsersLocations = () => {
  const {
    matchedLocations,
    upsertMatchedLocation,
    removeMatchedLocation,
    setMatchedLocations,
    currentLocation,
  } = useLocationStore();

  const { user: currentUser } = useAuthStore();
  const profileCache = useRef<Record<string, any>>({});

  const fetchMatchedLocations = useCallback(async () => {
    if (!currentUser) return;

    try {
      const thirtyMinutesAgo = new Date(
        Date.now() - LOCATION_HIDDEN_THRESHOLD,
      ).toISOString();

      // Fetch all active locations directly from Supabase
      const { data: locations, error: locationsError } = await supabase
        .from('user_locations')
        .select(
          `
                    user_id,
                    latitude,
                    longitude,
                    heading,
                    updated_at,
                    profile:profiles!inner(
                        full_name,
                        avatar_url,
                        last_active,
                        location_sharing_enabled
                    )
                `,
        )
        .neq('user_id', currentUser.id)
        .eq('profile.location_sharing_enabled', true)
        .gt('updated_at', thirtyMinutesAgo)
        .limit(50);

      if (locationsError) {
        console.error('[LocationSync] Fetch error:', locationsError);
        return;
      }

      const now = Date.now();
      const transformedLocations: MatchedUserLocation[] = (locations || []).map(
        (loc: any) => ({
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
          isOnline:
            now - new Date(loc.updated_at).getTime() < LOCATION_STALE_THRESHOLD,
        }),
      );

      setMatchedLocations(transformedLocations);

      // Seed profile cache
      transformedLocations.forEach(loc => {
        profileCache.current[loc.user_id] = {
          full_name: loc.profile.full_name,
          avatar_url: loc.profile.avatar_url,
          last_active: loc.profile.last_active,
          location_sharing_enabled: true,
        };
      });
    } catch (error) {
      console.error('[LocationSync] fetchMatchedLocations error:', error);
    }
  }, [setMatchedLocations, currentUser]);

  const handleLocationChange = useCallback(
    (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const now = Date.now();

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        console.log(`[LocationSync] Received update for: ${newRecord.user_id}`);

        // Ignore ourselves
        if (currentUser && newRecord.user_id === currentUser.id) return;

        const updatedAt = new Date(newRecord.updated_at).getTime();

        // Ignore old data
        if (now - updatedAt >= LOCATION_HIDDEN_THRESHOLD) {
          console.log(
            `[LocationSync] Ignoring stale update for ${newRecord.user_id}`,
          );
          return;
        }

        const processUpdate = (profile: any) => {
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
              isOnline: now - updatedAt < LOCATION_STALE_THRESHOLD,
            });
          }
        };

        // Check cache first
        if (profileCache.current[newRecord.user_id]) {
          processUpdate(profileCache.current[newRecord.user_id]);
        } else {
          (async () => {
            console.log(
              `[LocationSync] Fetching profile for new user: ${newRecord.user_id}`,
            );
            const { data: profile, error } = await supabase
              .from('profiles')
              .select(
                'full_name, avatar_url, last_active, location_sharing_enabled',
              )
              .eq('id', newRecord.user_id)
              .single();

            if (profile && !error) {
              profileCache.current[newRecord.user_id] = profile;
              processUpdate(profile);
            } else if (error) {
              console.error('[LocationSync] Profile fetch error:', error);
            }
          })();
        }
      } else if (eventType === 'DELETE') {
        console.log(`[LocationSync] Received DELETE for: ${oldRecord.user_id}`);
        removeMatchedLocation(oldRecord.user_id);
      }
    },
    [upsertMatchedLocation, removeMatchedLocation, currentUser],
  );

  // Get mock users data if in dev mode
  const mockLocations = useMockUsersLocations();

  // Subscribe to real-time updates (only when NOT in DEV_MODE)
  useEffect(() => {
    if (DEV_MODE) return;

    console.log('[LocationSync] Subscribing to user_locations...');
    const channel = supabase
      .channel('matched-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_locations',
        },
        handleLocationChange,
      )
      .subscribe((status) => {
        console.log(`[LocationSync] Subscription status: ${status}`);
      });

    // Initial fetch
    fetchMatchedLocations();

    return () => {
      console.log('[LocationSync] Unsubscribing from user_locations');
      supabase.removeChannel(channel);
    };
  }, [fetchMatchedLocations, handleLocationChange]);

  // Handle mock data (only when in DEV_MODE)
  useEffect(() => {
    if (!DEV_MODE) return;
    
    setMatchedLocations(mockLocations);
  }, [mockLocations, setMatchedLocations]);

  return {
    matchedLocations,
    refresh: fetchMatchedLocations,
  };
};

export default useMatchedUsersLocations;
