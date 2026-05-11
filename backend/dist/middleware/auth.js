"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const supabase_1 = require("../supabase");
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.verifyToken = verifyToken;
exports.default = exports.verifyToken;
