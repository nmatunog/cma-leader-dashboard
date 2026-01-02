# Vercel Deployment Guide
## Step-by-Step Production Deployment

---

## Pre-Deployment Checklist

### ✅ Code Status
- [x] All changes committed
- [x] Navigation revamp complete
- [x] Redirects implemented
- [x] Documentation ready

### ⚠️ TypeScript Errors
- Note: Pre-existing TypeScript errors may block build
- Recommendation: Fix errors OR configure Vercel to continue despite errors

---

## Step 1: Push to GitHub

```bash
# Verify status
git status

# Push to GitHub
git push origin main
```

---

## Step 2: Configure Vercel Environment Variables

### Access Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your project: `cma-leader-dashboard`
3. Go to **Settings** → **Environment Variables**

### Add Required Variables

Add these **exact** variable names (case-sensitive):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

**⚠️ Critical:** 
- All variables must start with `NEXT_PUBLIC_`
- Set `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to: `cma-dashboard-01-5a57b`
- Apply to **Production**, **Preview**, and **Development** environments

### Verify Variables
- [ ] All 6 variables are set
- [ ] Variable names match exactly (no typos)
- [ ] Values are correct
- [ ] Applied to all environments

---

## Step 3: Configure Build Settings

### Check Build Command
1. Go to **Settings** → **General**
2. Verify **Build Command**: `npm run build`
3. Verify **Output Directory**: `.next`
4. Verify **Install Command**: `npm install`

### Handle TypeScript Errors (If Needed)

If build fails due to TypeScript errors:

**Option 1: Fix Errors (Recommended)**
- Fix the pre-existing TypeScript errors
- Re-deploy

**Option 2: Modify Build Command (Temporary)**
- Change build command to: `npm run build -- --no-lint`
- Or: `SKIP_TYPE_CHECK=true npm run build`
- Note: This is not recommended for production

**Option 3: Update tsconfig.json**
- Set `"noEmit": true` (already set)
- Consider `"skipLibCheck": true` (already set)
- May need to adjust strict mode settings

---

## Step 4: Deploy to Production

### Method 1: Automatic Deployment (Recommended)
1. Push to `main` branch (if auto-deploy is enabled)
2. Vercel will automatically trigger a deployment
3. Monitor deployment in dashboard

### Method 2: Manual Deployment
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Select **"Promote to Production"**
4. Or click **"Deploy"** → **"Deploy to Production"**

### Method 3: Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## Step 5: Monitor Deployment

### During Deployment
- [ ] Watch build logs for errors
- [ ] Check for environment variable warnings
- [ ] Verify build completes successfully

### Build Log Checks
Look for:
- ✅ "Build completed successfully"
- ✅ No critical errors
- ⚠️ TypeScript warnings (may be acceptable)
- ❌ Build failures (need to fix)

---

## Step 6: Post-Deployment Verification

### Critical Tests (Do Immediately)

1. **Homepage**
   - URL: `https://your-domain.vercel.app/`
   - Expected: Dashboard loads without errors

2. **Login**
   - URL: `https://your-domain.vercel.app/login`
   - Expected: Login form appears, authentication works

3. **Sidebar Navigation**
   - Expected: Strategic Planning visible
   - Expected: Leaders/Agents Targets **NOT** visible

4. **Redirects**
   - URL: `https://your-domain.vercel.app/leaders-targets`
   - Expected: Redirects to Strategic Planning (Leader view, Goals tab)
   - URL: `https://your-domain.vercel.app/agents-targets`
   - Expected: Redirects to Strategic Planning (Advisor view, Goals tab)

5. **Strategic Planning**
   - URL: `https://your-domain.vercel.app/strategic-planning`
   - Expected: Page loads with Overview tab
   - Test: `?tab=goals&view=leader` opens Goals tab in Leader view
   - Test: `?tab=goals&view=advisor` opens Goals tab in Advisor view

6. **Goal Setting**
   - Navigate to Strategic Planning → Goal Setting tab
   - Expected: Form loads, can enter data, can submit

7. **Reports** (Admin only)
   - URL: `https://your-domain.vercel.app/reports`
   - Expected: Reports page loads
   - Expected: New Recruits column visible in all tables
   - Expected: Quarterly Summary section present

8. **Quarterly Summary**
   - On Reports page, click "Show Summary"
   - Expected: Table expands showing Q1-Q4 data
   - Click "Download CSV"
   - Expected: CSV file downloads

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Step 7: Monitor First Hour

### Error Monitoring
- [ ] Check Vercel dashboard → **Logs** tab
- [ ] Monitor for any errors
- [ ] Check browser console (F12) on production site
- [ ] Verify no 404 errors for old URLs

### Performance Monitoring
- [ ] Check page load times
- [ ] Verify no significant slowdown
- [ ] Check redirect performance

### User Activity
- [ ] Monitor redirect usage (if analytics available)
- [ ] Check user authentication attempts
- [ ] Verify goal submissions working

---

## Troubleshooting

### Build Fails

**Issue:** Build fails with TypeScript errors
**Solution:**
1. Check build logs in Vercel dashboard
2. Identify which errors are blocking
3. Fix errors or adjust build configuration
4. Re-deploy

**Issue:** Build fails with "Missing environment variables"
**Solution:**
1. Go to Settings → Environment Variables
2. Verify all 6 Firebase variables are set
3. Check variable names match exactly
4. Trigger new deployment after adding variables

### Redirects Not Working

**Issue:** Old URLs don't redirect
**Solution:**
1. Verify redirect pages exist: `app/leaders-targets/page.tsx`, `app/agents-targets/page.tsx`
2. Check browser console for errors
3. Verify Next.js routing is working
4. Clear browser cache and test again

### Strategic Planning Doesn't Load

**Issue:** Page shows error or blank
**Solution:**
1. Check browser console for errors
2. Verify Firebase environment variables are set
3. Check Vercel logs for server-side errors
4. Verify authentication is working

### Environment Variables Not Working

**Issue:** Firebase connection fails
**Solution:**
1. Verify all `NEXT_PUBLIC_*` variables are set in Vercel
2. Check variable names match exactly (case-sensitive)
3. **Important:** After adding/changing variables, trigger a NEW deployment
4. Environment variables are embedded at build time, so a new build is required

---

## Rollback Procedure

If critical issues arise:

### Quick Rollback (< 5 minutes)

1. Go to Vercel dashboard → **Deployments** tab
2. Find the previous working deployment
3. Click **"..."** → **"Promote to Production"**
4. Verify system is functional

### When to Rollback

Rollback immediately if:
- Critical functionality broken (login, goal submission)
- Data loss or corruption
- Security vulnerabilities
- Site completely inaccessible
- Multiple users reporting critical errors

---

## Success Criteria

After deployment, verify:
- ✅ No critical errors in logs
- ✅ All pages load correctly
- ✅ Redirects working
- ✅ User authentication working
- ✅ Goal submission working
- ✅ Reports displaying correctly
- ✅ No increase in error rate
- ✅ No user complaints about broken functionality

---

## Post-Deployment Checklist

### First Hour
- [ ] Monitor error logs continuously
- [ ] Test all critical paths
- [ ] Verify redirects working
- [ ] Check mobile responsiveness
- [ ] Monitor user activity

### First Day
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Check analytics (redirect usage)
- [ ] Verify all features working
- [ ] Address any urgent issues

### First Week
- [ ] Track adoption rates
- [ ] Monitor redirect usage
- [ ] Collect user feedback
- [ ] Plan improvements
- [ ] Document lessons learned

---

## Vercel-Specific Notes

### Build Configuration
- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `npm run build` (from `vercel.json`)
- **Output Directory:** `.next` (from `vercel.json`)
- **Install Command:** `npm install` (default)

### Environment Variables
- Variables are embedded at **build time**
- Must be set **before** deployment
- Changes require **new deployment** to take effect
- Can be set per environment (Production/Preview/Development)

### Deployment Settings
- **Auto-deploy:** Enabled if connected to GitHub
- **Branch:** `main` branch deploys to production
- **Preview:** Other branches create preview deployments

### Performance
- Vercel automatically optimizes Next.js apps
- Edge functions available
- CDN caching enabled
- Automatic HTTPS

---

## Support Resources

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Documentation:** https://vercel.com/docs
- **Deployment Logs:** Dashboard → Deployments → Select deployment → Logs
- **Environment Variables:** Dashboard → Settings → Environment Variables

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch error logs and user feedback
2. **Collect metrics** - Track redirect usage, adoption rates
3. **User communication** - Send announcement if needed
4. **Gather feedback** - Plan improvements based on user experience
5. **Plan Phase 2** - Consider Simple Mode and other enhancements

---

**Ready to deploy!** Follow the steps above and monitor closely after deployment.

