import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../supabase';

const router = Router();

// Get messages for a match
router.get('/:matchId', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        // Verify user is part of match
        const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single();

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        if (match.user1_id !== userId && match.user2_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
        *,
        sender:profiles(id, username, full_name, profile_photos, avatar_url)
      `)
            .eq('match_id', matchId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Mark messages as read
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('match_id', matchId)
            .neq('sender_id', userId)
            .eq('is_read', false);

        res.json({ messages: messages?.reverse() || [], page, limit });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/:matchId', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;
        const { content, message_type = 'text' } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify user is part of match
        const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single();

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        if (match.user1_id !== userId && match.user2_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                match_id: matchId,
                sender_id: userId,
                content,
                message_type,
            })
            .select(`
        *,
        sender:profiles(id, username, full_name, profile_photos, avatar_url)
      `)
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Update match's last activity
        await supabase
            .from('matches')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', matchId);

        res.json(message);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark messages as read
router.put('/:matchId/read', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('match_id', matchId)
            .neq('sender_id', userId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

export default router;
