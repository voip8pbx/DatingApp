"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
// Get all matches for current user
router.get('/', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: matches, error } = await supabase_1.supabase
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});
// Get single match by ID
router.get('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { data: match, error } = await supabase_1.supabase
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch match' });
    }
});
// Unmatch (delete match)
router.delete('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Verify user is part of match
        const { data: match } = await supabase_1.supabase
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
        const { error } = await supabase_1.supabase
            .from('matches')
            .update({ is_active: false })
            .eq('id', id);
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to unmatch' });
    }
});
exports.default = router;
