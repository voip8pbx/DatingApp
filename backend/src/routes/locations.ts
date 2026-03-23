import express, { Request, Response } from 'express';
import { supabase } from '../supabase';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// POST /api/locations/update - Upsert current user's location
router.post('/update', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { latitude, longitude, heading } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        // Check if ghost mode is enabled for this user
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('ghost_mode_enabled, location_sharing_enabled')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Check if location sharing is enabled
        if (!profile?.location_sharing_enabled) {
            return res.status(403).json({ error: 'Location sharing is disabled' });
        }

        // Apply fuzzy location if ghost mode is enabled
        let finalLat = latitude;
        let finalLng = longitude;

        if (profile?.ghost_mode_enabled) {
            // Add ±500m random offset (~0.009 degrees)
            finalLat = latitude + (Math.random() - 0.5) * 0.009;
            finalLng = longitude + (Math.random() - 0.5) * 0.009;
        }

        // Upsert location
        const { data, error } = await supabase
            .from('user_locations')
            .upsert({
                user_id: userId,
                latitude: finalLat,
                longitude: finalLng,
                heading: heading || null,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error upserting location:', error);
            return res.status(500).json({ error: 'Failed to update location' });
        }

        return res.json({ success: true, location: data });
    } catch (error) {
        console.error('Error in location update:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/locations/matches - Get latest locations of all matched users
router.get('/matches', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        // Get all active matches for the current user
        const { data: matches, error: matchesError } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .eq('is_active', true)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        if (matchesError) {
            console.error('Error fetching matches:', matchesError);
            return res.status(500).json({ error: 'Failed to fetch matches' });
        }

        if (!matches || matches.length === 0) {
            return res.json({ locations: [] });
        }

        // Get matched user IDs
        const matchedUserIds = matches.map(match =>
            match.user1_id === userId ? match.user2_id : match.user1_id
        );

        // Get locations of matched users (only if they have location sharing enabled and within 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { data: locations, error: locationsError } = await supabase
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
            .in('user_id', matchedUserIds)
            .gt('updated_at', fifteenMinutesAgo);

        if (locationsError) {
            console.error('Error fetching locations:', locationsError);
            return res.status(500).json({ error: 'Failed to fetch locations' });
        }

        // Transform the data
        const now = Date.now();
        const transformedLocations = (locations || []).map((loc: any) => {
            const updatedAt = new Date(loc.updated_at).getTime();
            const isOnline = (now - updatedAt) < 15 * 60 * 1000; // 15 minutes

            return {
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
                isOnline,
            };
        });

        return res.json({ locations: transformedLocations });
    } catch (error) {
        console.error('Error in get matches locations:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/locations/active - Get latest locations of all active users (for discovery)
router.get('/active', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        // Get locations of users who have location sharing enabled (handled by inner join or profiles filter)
        const { data: locations, error: locationsError } = await supabase
            .from('user_locations')
            .select(`
                user_id,
                latitude,
                longitude,
                heading,
                updated_at,
                profile:profiles!inner(
                    full_name,
                    avatar_url,
                    last_active,
                    location_sharing_enabled,
                    ghost_mode_enabled
                )
            `)
            .neq('user_id', userId)
            .eq('profile.location_sharing_enabled', true)
            .gt('updated_at', fifteenMinutesAgo)
            .limit(50); // Limit to 50 nearby/active users

        if (locationsError) {
            console.error('Error fetching active locations:', locationsError);
            return res.status(500).json({ error: 'Failed to fetch active users' });
        }

        // Transform the data
        const now = Date.now();
        const transformedLocations = (locations || []).map((loc: any) => ({
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
            isOnline: (now - new Date(loc.updated_at).getTime()) < 15 * 60 * 1000,
        }));

        return res.json({ locations: transformedLocations });
    } catch (error) {
        console.error('Error in get active locations:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/locations - Delete current user's location (when disabling location sharing)
router.delete('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        const { error } = await supabase
            .from('user_locations')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting location:', error);
            return res.status(500).json({ error: 'Failed to delete location' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error in delete location:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
