"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
// Get profiles for discovery
router.get('/discover', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        // Get current user's profile to apply filters
        const { data: currentProfile } = await supabase_1.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (!currentProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        // Get IDs of already swiped profiles
        const { data: swipedProfiles } = await supabase_1.supabase
            .from('swipes')
            .select('swiped_id')
            .eq('swiper_id', userId);
        const swipedIds = swipedProfiles?.map(s => s.swiped_id) || [];
        // Build query for discoverable profiles
        let query = supabase_1.supabase
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});
// Get profile by ID
router.get('/:id', auth_1.verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: profile, error } = await supabase_1.supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// Update own profile
router.put('/me', auth_1.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;
        const { data: profile, error } = await supabase_1.supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
exports.default = router;
