"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
// Record a swipe
router.post('/', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { swiped_id, direction } = req.body;
        if (!swiped_id || !direction) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Check if swipe already exists
        const { data: existingSwipe } = await supabase_1.supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', userId)
            .eq('swiped_id', swiped_id)
            .single();
        if (existingSwipe) {
            return res.status(400).json({ error: 'Already swiped this profile' });
        }
        // Create swipe
        const { data: swipe, error } = await supabase_1.supabase
            .from('swipes')
            .insert({
            swiper_id: userId,
            swiped_id,
            direction,
        })
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        // Check for match if direction is 'like'
        let matched = false;
        let matchId = null;
        if (direction === 'like') {
            // Check if the other user has also liked this user
            const { data: mutualLike } = await supabase_1.supabase
                .from('swipes')
                .select('*')
                .eq('swiper_id', swiped_id)
                .eq('swiped_id', userId)
                .eq('direction', 'like')
                .single();
            if (mutualLike) {
                // Create match
                const { data: match, error: matchError } = await supabase_1.supabase
                    .from('matches')
                    .insert({
                    user1_id: userId,
                    user2_id: swiped_id,
                })
                    .select()
                    .single();
                if (!matchError && match) {
                    matched = true;
                    matchId = match.id;
                }
            }
        }
        res.json({ swipe, matched, matchId });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record swipe' });
    }
});
// Get swipe history
router.get('/', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: swipes, error } = await supabase_1.supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(swipes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch swipes' });
    }
});
exports.default = router;
