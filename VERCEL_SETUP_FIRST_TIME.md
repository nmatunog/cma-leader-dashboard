# Vercel Setup - First Time Project Creation

## 🆕 Creating Your First Vercel Project

Since you don't see your project in Vercel, you need to create it first. Follow these steps:

---

## Step 1: Sign Up / Log In to Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"** (or **"Log In"** if you already have an account)
3. **Recommended:** Sign up with GitHub (easiest way to connect your repository)

---

## Step 2: Import Your GitHub Repository

### Option A: From Vercel Dashboard (Recommended)

1. After logging in, you'll see the Vercel dashboard
2. Click **"Add New..."** button (top right)
3. Select **"Project"**
4. You'll see a list of your GitHub repositories
5. **Find and select:** `cma-leader-dashboard`
6. Click **"Import"**

### Option B: From GitHub

1. Go to your GitHub repository: `https://github.com/nmatunog/cma-leader-dashboard`
2. Look for Vercel integration (if installed)
3. Or use the "Deploy to Vercel" button (if available)

### If Repository Not Visible

If you don't see your repository:
1. Click **"Adjust GitHub App Permissions"** or **"Configure GitHub App"**
2. Grant Vercel access to your repositories
3. Select **"All repositories"** or **"Only select repositories"** → Choose `cma-leader-dashboard`
4. Save and go back to import step

---

## Step 3: Configure Project Settings

Vercel will auto-detect Next.js, but verify these settings:

### Build Settings
- **Framework Preset:** Next.js (should be auto-detected)
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (should be auto-filled)
- **Output Directory:** `.next` (should be auto-filled)
- **Install Command:** `npm install` (should be auto-filled)

### Project Name
- **Project Name:** `cma-leader-dashboard` (or change if preferred)
- **Team:** Your personal account (or select a team)

### Environment Variables
**⚠️ IMPORTANT:** Set these BEFORE your first deployment!

Click **"Environment Variables"** section and add:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API Key | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **`cma-dashboard-01-5a57b`** | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your Firebase Storage Bucket | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Sender ID | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID | Production, Preview, Development |

**How to add:**
1. Click **"Add"** or **"Add New"**
2. Enter variable name (copy exactly from table above)
3. Enter value
4. Select all environments: ✅ Production, ✅ Preview, ✅ Development
5. Click **"Save"**
6. Repeat for all 6 variables

**⚠️ Critical Notes:**
- Variable names are **case-sensitive** - must match exactly
- All must start with `NEXT_PUBLIC_`
- Set `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to: `cma-dashboard-01-5a57b`
- You can add these later, but it's easier to add now

### Get Your Firebase Values

If you need your Firebase configuration values:
- Check your `.env.local` file (local development)
- Or Firebase Console → Project Settings → Your apps → Web app config

---

## Step 4: Deploy

1. After configuring settings, click **"Deploy"** button (bottom right)
2. Vercel will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Build your app (`npm run build`)
   - Deploy to production
3. Watch the build logs (takes 2-5 minutes)

### During Build

You'll see:
- ✅ Installing dependencies
- ✅ Building project
- ✅ Finalizing deployment

**If build fails:**
- Check the build logs for errors
- Common issues:
  - Missing environment variables → Add them and redeploy
  - TypeScript errors → See troubleshooting below
  - Build timeout → Contact support if needed

---

## Step 5: Your Site is Live!

After successful deployment:

1. **You'll see:** "Congratulations! Your project has been deployed"
2. **Your URL:** `https://cma-leader-dashboard.vercel.app` (or similar)
3. **Click the URL** to visit your site

---

## Step 6: Post-Deployment Verification

### Quick Tests

1. **Homepage**
   - Visit your Vercel URL
   - Should load without errors

2. **Login**
   - Go to `/login`
   - Should show login form

3. **Strategic Planning**
   - Go to `/strategic-planning`
   - Should load correctly

### Full Verification

See `VERCEL_DEPLOY_NOW.md` → Step 5 for complete verification checklist.

---

## Troubleshooting

### "Repository Not Found"

**Issue:** Can't find your GitHub repository in Vercel  
**Solution:**
1. Go to Vercel → Settings → Git
2. Click "Configure GitHub App"
3. Grant access to your repositories
4. Select `cma-leader-dashboard` repository
5. Go back and try importing again

### "Build Failed"

**Issue:** Build fails with errors  
**Solution:**
1. Check build logs in Vercel dashboard
2. Common causes:
   - Missing environment variables → Add them
   - TypeScript errors → See `DEPLOYMENT_STATUS.md`
   - Dependencies not installing → Check `package.json`

### "Environment Variables Not Working"

**Issue:** Firebase connection fails after deployment  
**Solution:**
1. Go to Project Settings → Environment Variables
2. Verify all 6 variables are set
3. Check variable names match exactly (case-sensitive)
4. **Important:** After adding variables, trigger a NEW deployment
5. Variables are embedded at build time, so rebuild is required

### "Can't Access Dashboard"

**Issue:** Can't log in to Vercel  
**Solution:**
1. Go to https://vercel.com/login
2. Use "Sign in with GitHub" (recommended)
3. Or create account with email
4. Verify email if needed

---

## Next Steps

After successful deployment:

1. **Set up custom domain** (optional)
   - Go to Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Configure automatic deployments**
   - Already enabled by default
   - Every push to `main` branch auto-deploys
   - Other branches create preview deployments

3. **Monitor your deployment**
   - Check Analytics tab for usage stats
   - Monitor Logs tab for errors
   - Set up alerts if needed

4. **Read full deployment guide**
   - See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed information
   - See `VERCEL_DEPLOY_NOW.md` for deployment checklist

---

## Quick Reference

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Sign Up:** https://vercel.com/signup
- **Documentation:** https://vercel.com/docs
- **Your Repository:** https://github.com/nmatunog/cma-leader-dashboard

---

## Summary Checklist

- [ ] Signed up/logged in to Vercel
- [ ] Connected GitHub account
- [ ] Imported `cma-leader-dashboard` repository
- [ ] Verified build settings (Next.js auto-detected)
- [ ] Added all 6 Firebase environment variables
- [ ] Clicked "Deploy"
- [ ] Build completed successfully
- [ ] Site is live at Vercel URL
- [ ] Tested homepage and login
- [ ] Verified Strategic Planning works

---

**🚀 Ready to create your Vercel project! Follow the steps above to get started.**


