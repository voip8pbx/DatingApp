"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../supabase");
const router = (0, express_1.Router)();
// Verify JWT token
router.post('/verify', auth_1.verifyToken, async (req, res) => {
    try {
        const user = req.user;
        // Get user profile
        const { data: profile } = await supabase_1.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        res.json({ user, profile });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to verify token' });
    }
});
// Get current user profile
router.get('/me', auth_1.verifyToken, async (req, res) => {
    try {
        const { data: profile } = await supabase_1.supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});
exports.default = router;
