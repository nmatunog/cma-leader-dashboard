# Deployment Guide: Firebase Hosting or Vercel

This guide covers deploying the CMA Leader Performance Dashboard to either Firebase Hosting or Vercel.

## ⚡ Quick Recommendation: Use Vercel

**Vercel is recommended** because:
- ✅ Built specifically for Next.js (created by the Next.js team)
- ✅ Zero configuration needed
- ✅ Automatic environment variable handling
- ✅ Serverless functions for API routes and server actions
- ✅ Automatic HTTPS and CDN
- ✅ Free tier is generous
- ✅ Continuous deployment from GitHub
- ✅ Works seamlessly with Firebase services (Firestore, Auth, etc.)

---

## 🚀 Option 1: Deploy to Vercel (Recommended)

### Prerequisites
- GitHub repository with your code
- Vercel account (free at [vercel.com](https://vercel.com))

### Step 1: Sign up and Import Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** (you can use GitHub to sign up)
3. Click **"Add New..."** → **"Project"**
4. Import your GitHub repository (`cma-leader-dashboard`)
5. Vercel will auto-detect Next.js

### Step 2: Configure Environment Variables

In the Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add all Firebase environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id (optional)
```

3. Set scope to **"Production"**, **"Preview"**, and **"Development"**
4. Click **"Save"**

### Step 3: Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Build your Next.js app
   - Embed environment variables
   - Deploy to a URL like `your-project.vercel.app`
3. Your app will be live in ~2 minutes!

### Step 4: Verify Deployment

1. Visit your deployment URL
2. Navigate to `/setup` to create your admin user
3. Test the application

### Continuous Deployment

- Every push to your `main` branch automatically triggers a new deployment
- Pull requests get preview deployments
- No manual deployments needed!

---

## 🔥 Option 2: Deploy to Firebase Hosting

Firebase Hosting is good if you want everything in one Firebase ecosystem, but requires more setup for Next.js server features.

### Prerequisites
- Firebase project created
- Firebase CLI installed: `npm install -g firebase-tools`
- Node.js 20+ installed

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase Hosting

```bash
cd "/Users/nmatunog2/1CMA_Learning_Hub/CMA Leader Performance Dashboard/cma-dashboard"
firebase init hosting
```

When prompted:
- **Select existing project**: Choose your Firebase project (`cma-dashboard-01`)
- **Public directory**: `.next` (or `out` if using static export)
- **Single-page app**: Yes
- **Set up automatic builds**: No (we'll handle builds manually or via CI/CD)

### Step 4: Configure Next.js for Firebase Hosting

Since Next.js has server-side features (server actions, API routes), you have two options:

#### Option A: Static Export (Simpler, but loses server features)

Update `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: 'export', // Enable static export
  // ... rest of config
};
```

**Limitation**: This disables server actions and API routes. Only use if you don't need server-side features.

#### Option B: Firebase Hosting + Cloud Run (Full functionality)

For full Next.js functionality with server features, you need Cloud Run. This requires:
1. Building a Docker container
2. Deploying to Cloud Run
3. Connecting Firebase Hosting to Cloud Run

This is more complex. See [Firebase Hosting + Cloud Run documentation](https://firebase.google.com/docs/hosting/cloud-run) for details.

### Step 5: Build and Deploy

For static export:
```bash
npm run build
firebase deploy --only hosting
```

For Cloud Run setup (see Firebase docs for full instructions):
```bash
npm run build
# Build Docker image, deploy to Cloud Run, then:
firebase deploy --only hosting
```

### Step 6: Set Environment Variables in Firebase

Since Firebase Hosting doesn't support environment variables directly:

1. **For Cloud Run**: Set environment variables in Cloud Run service settings
2. **For static export**: Environment variables must be embedded at build time

---

## 📊 Comparison

| Feature | Vercel | Firebase Hosting |
|---------|--------|------------------|
| Next.js Support | ✅ Native, zero config | ⚠️ Requires setup |
| Server Actions | ✅ Full support | ⚠️ Needs Cloud Run |
| Environment Variables | ✅ Built-in support | ⚠️ Requires Cloud Run or build-time |
| Setup Complexity | ⭐ Easy | ⭐⭐⭐ Complex |
| Deployment Speed | ⚡ Very fast | 🐢 Slower |
| Free Tier | ✅ Generous | ✅ Generous |
| Firebase Integration | ✅ Works seamlessly | ✅ Native integration |

---

## 🎯 Recommendation

**Use Vercel** unless you have a specific requirement to use Firebase Hosting. Vercel:
- Handles Next.js perfectly out of the box
- Makes environment variables easy
- Provides automatic deployments
- Works great with Firebase services (Firestore, Auth, etc.)

Your Firebase services (Firestore, Authentication) work exactly the same whether deployed on Vercel or Firebase Hosting.

---

## 🔒 Security Checklist (After Deployment)

- [ ] Verify all environment variables are set correctly
- [ ] Test authentication flow
- [ ] Verify Firestore security rules are active
- [ ] Test user management features
- [ ] Verify HTTPS is enabled (automatic on both platforms)
- [ ] Set up custom domain (optional)
- [ ] Configure Firebase Authentication authorized domains

---

## 🆘 Troubleshooting

### Vercel Deployment Issues

**Build fails:**
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Check `package.json` build script

**Environment variables not working:**
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding variables
- Check variable names match exactly

### Firebase Hosting Issues

**Build fails:**
- Check Node.js version (needs 20+)
- Verify Firebase CLI is logged in
- Check `firebase.json` configuration

**Static export not working:**
- Ensure `output: 'export'` in `next.config.ts`
- Remove server-side features if using static export

---

## 📝 Next Steps After Deployment

1. ✅ Create admin user via `/setup` page
2. ✅ Test authentication flows
3. ✅ Verify Firestore rules
4. ✅ Test user management
5. ✅ Set up custom domain (optional)
6. ✅ Configure Firebase authorized domains for your new domain

