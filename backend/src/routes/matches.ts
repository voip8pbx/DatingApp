import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../supabase';

const router = Router();

// Get all matches for current user
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;

        const { data: matches, error } = await supabase
            .from('matches')
            .select(`
        *,
        user1:profiles!user1_id(id, username, full_name, age, gender, profile_photos, avatar_url, city, is_premium),
        user2:profiles!user2_id(id, username, full_name, age, gender, profile_photos, avatar_url, city, is_premium)
      `)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Transform to include other user
        const transformedMatches = matches?.map(match => {
            const otherUser = match.user1_id === userId ? match.user2 : match.user1;
            return {
                ...match,
                other_user: otherUser,
            };
        });

        res.json(transformedMatches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// Get single match by ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: match, error } = await supabase
            .from('matches')
            .select(`
        *,
        user1:profiles!user1_id(*),
        user2:profiles!user2_id(*)
      `)
            .eq('id', id)
            .single();

        if (error || !match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Verify user is part of match
        if (match.user1_id !== userId && match.user2_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const otherUser = match.user1_id === userId ? match.user2 : match.user1;
        res.json({ ...match, other_user: otherUser });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch match' });
    }
});

// Unmatch (delete match)
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify user is part of match
        const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('id', id)
            .single();

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        if (match.user1_id !== userId && match.user2_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('matches')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unmatch' });
    }
});

export default router;
