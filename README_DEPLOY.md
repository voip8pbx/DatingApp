# 🚀 Quick Deploy to Vercel (Backend)

Follow these 3 steps to deploy your backend to Vercel.

### 1. Install Vercel CLI
If you haven't yet:
```bash
npm i -g vercel
```

### 2. Configure Environment Variables on Vercel
Go to your [Vercel Dashboard](https://vercel.com/dashboard) → **Project Settings** → **Environment Variables** and add:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `ALLOWED_ORIGINS` (Comma-separated list of allowed domains, or `*` for testing)

### 3. Deploy
From the root of your project:
```bash
cd backend
vercel --prod
```

---

### 📱 Updating the Mobile App
Once deployed, copy your Vercel URL (e.g., `https://dating-app-backend.vercel.app`) and update your `.env` in the root:

```env
API_URL=https://dating-app-backend.vercel.app
```

Then rebuild your mobile app.

---

### 🛠️ Key Changes Made for Deployment
- Added `vercel.json` to the backend.
- Fixed backend `index.ts` for serverless compatibility.
- Added a `Config.ts` layer in the mobile app for easy URL switching.
- Improved `DEV_MODE` handling in Supabase configs.
