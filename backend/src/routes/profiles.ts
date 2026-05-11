import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../supabase';

const router = Router();

// Get profiles for discovery
router.get('/discover', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // Get current user's profile to apply filters
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!currentProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Get IDs of already swiped profiles
        const { data: swipedProfiles } = await supabase
            .from('swipes')
            .select('swiped_id')
            .eq('swiper_id', userId);

        const swipedIds = swipedProfiles?.map(s => s.swiped_id) || [];

        // Build query for discoverable profiles
        let query = supabase
            .from('profiles')
            .select('*')
            .neq('id', userId)
            .gte('age', currentProfile.age_min || 18)
            .lte('age', currentProfile.age_max || 35)
            .order('last_active', { ascending: false })
            .range(offset, offset + limit - 1);

        if (swipedIds.length > 0) {
            query = query.not('id', 'in', `(${swipedIds.join(',')})`);
        }

        // Apply gender filter
        if (currentProfile.interested_gender && currentProfile.interested_gender.length > 0) {
            query = query.in('gender', currentProfile.interested_gender);
        }

        const { data: profiles, error } = await query;

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ profiles, page, limit });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});

// Get profile by ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update own profile
router.put('/me', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
