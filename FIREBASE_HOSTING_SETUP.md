# Firebase Hosting Deployment Guide

Since your Next.js app uses server actions, we need Firebase Hosting with Cloud Run for full functionality.

## Option 1: Firebase Hosting + Cloud Run (Recommended)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase

```bash
cd cma-dashboard
firebase init
```

Select:
- ✅ Hosting
- ✅ Functions (if needed)
- Use existing project: `cma-leader-dashboard`

### Step 4: Update next.config.ts for Standalone

```typescript
const nextConfig: NextConfig = {
  // ... existing config
  output: 'standalone',
};
```

### Step 5: Build and Deploy

```bash
npm run build
firebase deploy --only hosting
```

**However**, Firebase Hosting alone doesn't support Next.js server features. For server actions, you need Cloud Run.

## Option 2: Simpler - Deploy to Vercel (Made for Next.js)

Vercel is created by the Next.js team and handles everything automatically:

### Advantages:
- ✅ Built specifically for Next.js
- ✅ Automatic environment variable handling
- ✅ Serverless functions for API routes/server actions
- ✅ Automatic HTTPS and CDN
- ✅ Free tier is generous
- ✅ Continuous deployment from GitHub

### Steps:

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up** (free)
3. **Import your GitHub repository**
4. **Add environment variables** in Vercel dashboard:
   - All 6 `NEXT_PUBLIC_FIREBASE_*` variables
   - `NEXT_PUBLIC_ADMIN_PASSWORD` (if using)
5. **Deploy** - Vercel handles the rest!

Vercel will automatically:
- Detect Next.js
- Build your app correctly
- Embed environment variables
- Deploy with proper configuration

## Option 3: Keep Netlify but Fix the Issue

Before switching, we could try one more thing - the issue might be that Netlify isn't passing env vars to Next.js properly.

Would you like to:
1. **Try Vercel** (easiest, most reliable for Next.js)
2. **Set up Firebase Hosting + Cloud Run** (more complex, but keeps everything in Firebase)
3. **Try one more Netlify fix** (check if build command needs adjustment)

## My Recommendation

**Go with Vercel** because:
- It's designed for Next.js
- Environment variables work seamlessly
- No configuration needed
- Free tier is generous
- Your Firebase services (Firestore, Auth) work exactly the same from Vercel

Which option would you prefer?

