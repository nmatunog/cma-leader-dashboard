# Quick Vercel Setup - 5 Minutes

## 🚀 Fast Setup Guide

Since you don't have a Vercel project yet, here's the fastest way to get started:

---

## Step 1: Create Project (2 minutes)

1. **Go to:** https://vercel.com
2. **Sign in** (or Sign up with GitHub - recommended)
3. **Click:** "Add New..." → "Project"
4. **Find:** `cma-leader-dashboard` in your GitHub repos
5. **Click:** "Import"

**If you don't see your repo:**
- Click "Configure GitHub App" or "Adjust GitHub App Permissions"
- Grant access to your repositories
- Select `cma-leader-dashboard`
- Try importing again

---

## Step 2: Add Environment Variables (2 minutes)

**Before clicking Deploy**, add these 6 variables:

1. Click **"Environment Variables"** section
2. For each variable below, click **"Add"**:

```
NEXT_PUBLIC_FIREBASE_API_KEY = [your value]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = [your value]
NEXT_PUBLIC_FIREBASE_PROJECT_ID = cma-dashboard-01-5a57b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = [your value]
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = [your value]
NEXT_PUBLIC_FIREBASE_APP_ID = [your value]
```

**Important:**
- Select all 3 environments: ✅ Production, ✅ Preview, ✅ Development
- Copy variable names EXACTLY (case-sensitive)
- Get values from your `.env.local` file or Firebase Console

---

## Step 3: Deploy (1 minute)

1. Click **"Deploy"** button
2. Wait 2-5 minutes for build
3. Your site will be live!

---

## Done! ✅

Your site URL will be: `https://cma-leader-dashboard.vercel.app` (or similar)

**Next:** Test your site and verify everything works!

---

## Need Help?

- **Detailed guide:** See `VERCEL_SETUP_FIRST_TIME.md`
- **Get Firebase values:** Check `.env.local` or Firebase Console
- **Troubleshooting:** See `VERCEL_DEPLOYMENT_GUIDE.md`


