import { Router, Request, Response } from 'express';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../supabase';

const router = Router();

// Verify JWT token
router.post('/verify', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        res.json({ user, profile });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

// Get current user profile
router.get('/me', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

export default router;
