# Deploy Next.js to Firebase Hosting

Since you're already using Firebase (Firestore, Auth), deploying to Firebase Hosting consolidates everything in one platform.

## Prerequisites

1. Firebase CLI installed
2. Firebase project created (`cma-leader-dashboard`)
3. Node.js 20+ installed locally

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Or using yarn:
```bash
yarn global add firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

## Step 3: Initialize Firebase in Your Project

In your project root (`cma-dashboard` folder):

```bash
firebase init hosting
```

When prompted:
- **Select existing project**: Choose `cma-leader-dashboard`
- **Public directory**: Use `.next` (Next.js output) or we can configure it differently
- **Single-page app**: Yes (Next.js handles routing)
- **Set up automatic builds**: No (we'll do manual builds)

## Step 4: Configure Firebase Hosting

Firebase will create `firebase.json`. We need to configure it for Next.js:

Since Next.js has server-side features (server actions), we have two options:

### Option A: Static Export (if your app can be static)

Only works if you don't need server-side rendering for all pages.

### Option B: Firebase Hosting + Cloud Run (Recommended)

For full Next.js features including server actions.

## Step 5: Configure for Next.js with Server Actions

Update `firebase.json`:

```json
{
  "hosting": {
    "public": ".next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "nextjs",
          "region": "us-central1"
        }
      }
    ]
  },
  "run": {
    "source": "."
  }
}
```

However, for Next.js apps with server features, Firebase Hosting alone might not work. Better approach:

## Alternative: Use Firebase Hosting with Standalone Next.js

### Step 1: Update next.config.ts

Add standalone output:

```typescript
const nextConfig: NextConfig = {
  // ... existing config
  output: 'standalone',
};
```

### Step 2: Build Configuration

We'll need a different approach. Let me create a proper setup guide.

## Recommended: Firebase Hosting + Cloud Run

This is the best approach for Next.js apps with server features.

### Setup Steps:

1. **Build Next.js app**:
```bash
npm run build
```

2. **Create Cloud Run service** or use Firebase Functions

Actually, for Next.js with server actions, the easiest is:

## Simplest Solution: Deploy to Vercel (Made for Next.js)

Vercel is made by the Next.js team and handles everything automatically:

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

But if you want Firebase Hosting specifically, we need Cloud Run integration.

## Better Approach: Firebase Hosting + Cloud Functions (Serverless)

For Next.js apps, Firebase Hosting with Cloud Functions provides the server environment needed.

Would you like me to:
1. Set up Firebase Hosting with Cloud Run/Cloud Functions for Next.js?
2. Or switch to Vercel (easier, made for Next.js)?
3. Or try one more fix for Netlify?

