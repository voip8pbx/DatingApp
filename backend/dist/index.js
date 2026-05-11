"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const profiles_1 = __importDefault(require("./routes/profiles"));
const swipes_1 = __importDefault(require("./routes/swipes"));
const matches_1 = __importDefault(require("./routes/matches"));
const messages_1 = __importDefault(require("./routes/messages"));
const locations_1 = __importDefault(require("./routes/locations"));
// Load environment variables from .env file
// Check both local backend folder and project root
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/profiles', profiles_1.default);
app.use('/api/swipes', swipes_1.default);
app.use('/api/matches', matches_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/locations', locations_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Dating App API is running' });
});
// Error handling middleware
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.default = app;
