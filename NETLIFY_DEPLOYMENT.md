# Netlify Deployment Guide

Complete guide for deploying CMA Leader Performance Dashboard to Netlify.

## Quick Start

1. **Push code to Git repository** (GitHub/GitLab/Bitbucket)
2. **Connect to Netlify** and import repository
3. **Set environment variables** in Netlify dashboard
4. **Deploy** - Netlify handles the rest!

## Prerequisites

- ✅ Netlify account ([Sign up free](https://app.netlify.com))
- ✅ Git repository (GitHub/GitLab/Bitbucket)
- ✅ Firebase project configured
- ✅ All code committed and pushed

## Step-by-Step Instructions

### 1. Prepare Your Code

Ensure these files are in your repository:
- ✅ `netlify.toml` (configuration file)
- ✅ `package.json` (with build scripts)
- ✅ `.env.example` (for reference)
- ✅ All source code

**Important:** Do NOT commit `.env` or `.env.local` files!

### 2. Connect Repository to Netlify

1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** > **"Import an existing project"**
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Authorize Netlify to access your repositories
5. Select the repository containing your dashboard code

### 3. Configure Build Settings

Netlify should auto-detect Next.js, but verify these settings:

**Basic Build Settings:**
- **Base directory**: (leave empty, or `cma-dashboard` if repo root is parent)
- **Build command**: `npm run build`
- **Publish directory**: `.next` (or leave empty - Netlify handles it)

**Advanced Build Settings:**
- **Node version**: 18 (set in `netlify.toml`)
- **NPM version**: Latest (auto-detected)

### 4. Set Environment Variables

**Critical Step!** Your app won't work without these.

1. In Netlify dashboard, go to **Site settings** > **Environment variables**
2. Click **"Add a variable"**
3. Add each variable one by one:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

4. Set **Scope** to **"All scopes"** (Production, Deploy previews, Branch deploys)
5. Click **"Save"** after each variable

**Where to find Firebase values:**
- Firebase Console > Project Settings > General > Your apps
- Copy values from Firebase config object

### 5. Install Next.js Plugin (Recommended)

For optimal Next.js performance on Netlify:

1. Go to **Site settings** > **Plugins**
2. Search for **"@netlify/plugin-nextjs"**
3. Click **"Install"**
4. The plugin will optimize your Next.js deployment automatically

### 6. Deploy

1. Click **"Deploy site"** button
2. Watch the build logs in real-time
3. Wait for deployment to complete (usually 2-5 minutes)
4. Your site will be live at `https://your-site-name.netlify.app`

### 7. Verify Deployment

After deployment:

- [ ] Site loads without errors
- [ ] Dashboard displays correctly
- [ ] Firebase connection works
- [ ] Google Sheets sync works
- [ ] Strategic Planning section functions
- [ ] No console errors in browser

## Custom Domain Setup

### Option 1: Netlify Domain

Netlify provides a free domain: `your-site-name.netlify.app`

### Option 2: Custom Domain

1. Go to **Site settings** > **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `dashboard.yourcompany.com`)
4. Follow DNS configuration instructions:
   - Add CNAME record: `dashboard` → `your-site-name.netlify.app`
   - Or add A record: `@` → Netlify IP (provided)
5. Wait for DNS propagation (5 minutes to 48 hours)
6. Netlify will automatically provision SSL certificate

## Continuous Deployment

Netlify automatically deploys:

- **Production**: On push to `main` branch
- **Deploy Previews**: On pull requests
- **Branch Deploys**: On push to other branches

### Configure Branch Deploys

1. Go to **Site settings** > **Build & deploy** > **Continuous deployment**
2. Under **"Branch deploys"**, configure:
   - Which branches to deploy
   - Build settings per branch (if different)

### Deploy Previews

- Automatically created for pull requests
- Share preview URL with team for testing
- Preview includes all environment variables

## Environment Variables Management

### Production Variables

Set in **Site settings** > **Environment variables**:
- Available to all production deployments
- Secure and encrypted

### Deploy Preview Variables

- Inherit from production by default
- Can override per deploy preview if needed

### Branch Deploy Variables

- Can set branch-specific variables
- Useful for staging environments

## Monitoring & Logs

### Build Logs

- View in **Deploys** tab
- Shows build output, errors, warnings
- Download full logs if needed

### Function Logs

- View in **Functions** tab (if using Netlify Functions)
- Real-time logs for serverless functions

### Site Analytics

- Enable in **Site settings** > **Analytics**
- View traffic, performance metrics
- Free tier includes basic analytics

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Add all `NEXT_PUBLIC_FIREBASE_*` variables in Netlify dashboard

**Error: Build command failed**
- Check build logs for specific error
- Verify `package.json` has correct scripts
- Ensure Node.js version is 18+

**Error: Module not found**
- Run `npm install` locally to verify dependencies
- Check `package.json` for missing dependencies

### Runtime Errors

**Firebase connection fails**
- Verify environment variables are set correctly
- Check Firebase project ID matches
- Verify Firestore is enabled in Firebase Console

**Google Sheets not loading**
- Check sheet URLs are correct
- Verify sheets are published as CSV
- Check CORS settings (if applicable)

**Page not found errors**
- Verify `netlify.toml` redirects are correct
- Check Next.js routing configuration
- Ensure all pages are in `app/` directory

### Performance Issues

**Slow page loads**
- Enable `@netlify/plugin-nextjs` plugin
- Check bundle size in build output
- Review cache headers in `netlify.toml`

**Large bundle size**
- Run `npm run build` locally to see bundle analysis
- Consider code splitting
- Optimize images and assets

## Rollback

If deployment has issues:

1. Go to **Deploys** tab
2. Find previous successful deployment
3. Click **"..."** menu > **"Publish deploy"**
4. Site will rollback to that version

## Advanced Configuration

### Build Hooks

Create build hooks for external triggers:
1. **Site settings** > **Build & deploy** > **Build hooks**
2. Create hook and get URL
3. Use URL to trigger builds via webhook

### Split Testing

Test different versions:
1. **Site settings** > **Split testing**
2. Configure percentage splits
3. Test different features/configurations

### Form Handling

Netlify can handle form submissions:
- Configure in `netlify.toml`
- Forms automatically captured
- View submissions in Netlify dashboard

## Cost

**Netlify Free Tier Includes:**
- ✅ 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ SSL certificates
- ✅ Deploy previews
- ✅ Form submissions (100/month)

**Upgrade if you need:**
- More bandwidth
- More build minutes
- More form submissions
- Team collaboration features

## Support Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Netlify Community](https://answers.netlify.com/)
- [Netlify Status](https://www.netlifystatus.com/)

## Checklist

Before going live:

- [ ] All environment variables set
- [ ] Build completes successfully
- [ ] Site loads without errors
- [ ] Firebase connection works
- [ ] All features tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Analytics enabled (optional)
- [ ] Error monitoring set up (optional)
- [ ] Team has access (if applicable)

---

**Need Help?** Check Netlify dashboard logs or contact Netlify support.

