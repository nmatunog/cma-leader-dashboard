# 🚀 Deploy to Vercel - Action Steps

## ✅ Status: Ready to Deploy

All code is committed locally. Follow these steps to deploy to Vercel.

---

## Step 1: Push to GitHub (2 minutes)

**Run these commands in your terminal:**

```bash
cd /Users/nmatunog2/2CMA/cma-leader-dashboard

# Verify status
git status

# Push all commits to GitHub
git push origin main
```

**Expected output:** Commits pushed successfully

---

## Step 2: Configure Vercel Environment Variables (5 minutes)

### Access Vercel Dashboard
1. Go to **https://vercel.com/dashboard**
2. Select your project: `cma-leader-dashboard`
3. Navigate to **Settings** → **Environment Variables**

### Add These 6 Variables

Click **"Add New"** for each variable:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API Key | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **`cma-dashboard-01-5a57b`** | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your Firebase Storage Bucket | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Sender ID | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID | Production, Preview, Development |

**⚠️ Critical:**
- Variable names must match **exactly** (case-sensitive)
- All must start with `NEXT_PUBLIC_`
- Set `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to: `cma-dashboard-01-5a57b`
- Apply to **all environments** (Production, Preview, Development)

### Verify Variables
- [ ] All 6 variables added
- [ ] Names match exactly (no typos)
- [ ] Values are correct
- [ ] Applied to all environments

---

## Step 3: Deploy to Production (2 minutes)

### Option A: Automatic Deployment (If Connected to GitHub)
1. After pushing to GitHub (Step 1), Vercel will automatically detect the push
2. Go to **Deployments** tab
3. Watch the deployment build
4. Once complete, it will be live at `https://your-project.vercel.app`

### Option B: Manual Deployment
1. Go to **Deployments** tab
2. Click **"Deploy"** button (top right)
3. Select **"Deploy to Production"**
4. Or click **"..."** on latest deployment → **"Promote to Production"**

### Option C: Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## Step 4: Monitor Build (5 minutes)

### Watch Build Logs
1. Go to **Deployments** tab
2. Click on the active deployment
3. Watch the **Build Logs**

### What to Look For
- ✅ **Success:** "Build completed successfully"
- ⚠️ **Warnings:** TypeScript warnings (may be acceptable)
- ❌ **Errors:** Build failures (need to fix)

### If Build Fails
- Check error message in logs
- Common issues:
  - Missing environment variables → Add them and redeploy
  - TypeScript errors → See troubleshooting in `VERCEL_DEPLOYMENT_GUIDE.md`
  - Build timeout → Check build command

---

## Step 5: Post-Deployment Verification (10 minutes)

### Critical Tests (Do These First!)

1. **Homepage**
   ```
   URL: https://your-project.vercel.app/
   Expected: Dashboard loads without errors
   ```

2. **Login**
   ```
   URL: https://your-project.vercel.app/login
   Expected: Login form appears, can authenticate
   ```

3. **Sidebar Navigation**
   ```
   Expected: "Strategic Planning" visible
   Expected: "Leaders Targets" NOT visible
   Expected: "Agents Targets" NOT visible
   ```

4. **Redirects**
   ```
   URL: https://your-project.vercel.app/leaders-targets
   Expected: Redirects to Strategic Planning (Leader view, Goals tab)
   
   URL: https://your-project.vercel.app/agents-targets
   Expected: Redirects to Strategic Planning (Advisor view, Goals tab)
   ```

5. **Strategic Planning**
   ```
   URL: https://your-project.vercel.app/strategic-planning
   Expected: Page loads with Overview tab
   
   Test: https://your-project.vercel.app/strategic-planning?tab=goals&view=leader
   Expected: Opens Goals tab in Leader view
   
   Test: https://your-project.vercel.app/strategic-planning?tab=goals&view=advisor
   Expected: Opens Goals tab in Advisor view
   ```

6. **Goal Setting**
   ```
   Navigate: Strategic Planning → Goal Setting tab
   Expected: Form loads, can enter data, can submit
   ```

7. **Reports** (Admin only)
   ```
   URL: https://your-project.vercel.app/reports
   Expected: Reports page loads
   Expected: "New Recruits" column visible in all tables
   Expected: "Quarterly Summary" section present
   ```

8. **Quarterly Summary**
   ```
   On Reports page: Click "Show Summary"
   Expected: Table expands showing Q1-Q4 data
   Click "Download CSV"
   Expected: CSV file downloads
   ```

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Step 6: Monitor First Hour

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

### Build Fails with TypeScript Errors

**Solution:**
1. Check build logs for specific errors
2. See `DEPLOYMENT_STATUS.md` for list of known errors
3. Fix errors OR temporarily modify build command
4. Re-deploy

### Environment Variables Not Working

**Solution:**
1. Verify all 6 variables are set in Vercel
2. Check variable names match exactly (case-sensitive)
3. **Important:** After adding/changing variables, trigger a NEW deployment
4. Environment variables are embedded at build time

### Redirects Not Working

**Solution:**
1. Verify redirect pages exist: `app/leaders-targets/page.tsx`, `app/agents-targets/page.tsx`
2. Check browser console for errors
3. Clear browser cache and test again
4. Verify Next.js routing is working

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

## Quick Reference

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Detailed Guide:** See `VERCEL_DEPLOYMENT_GUIDE.md`
- **Quick Checklist:** See `VERCEL_DEPLOYMENT_CHECKLIST.md`
- **Status:** See `DEPLOYMENT_STATUS.md`

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch error logs and user feedback
2. **Collect metrics** - Track redirect usage, adoption rates
3. **User communication** - Send announcement if needed
4. **Gather feedback** - Plan improvements based on user experience

---

**🚀 Ready to deploy! Follow the steps above and monitor closely after deployment.**


