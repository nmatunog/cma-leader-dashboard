# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the CMA Leader Dashboard to production, specifically for the navigation revamp and Strategic Planning consolidation.

---

## Pre-Deployment Checklist

See `PRODUCTION_DEPLOYMENT_CHECKLIST.md` for a comprehensive checklist.

### Quick Pre-Flight Check

```bash
# 1. Verify code is committed
git status
# Should show: "nothing to commit, working tree clean"

# 2. Verify build works
npm run build
# Should complete successfully

# 3. Verify TypeScript compilation
npm run type-check
# Should show no errors (note: some pre-existing errors may exist)
```

---

## Environment Configuration

### Required Environment Variables

Configure these in your hosting platform (Vercel/Netlify/etc.):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cma-dashboard-01-5a57b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**⚠️ Important:** 
- All variables must start with `NEXT_PUBLIC_` for client-side access
- Verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is exactly: `cma-dashboard-01-5a57b`
- Never commit `.env.local` file to git

---

## Deployment Steps

### For Vercel

1. **Via Dashboard (Recommended)**
   - Go to https://vercel.com/dashboard
   - Select your project
   - Click "Deployments"
   - Click "..." on latest deployment → "Promote to Production"
   - Or push to `main` branch (auto-deploys if configured)

2. **Via CLI**
   ```bash
   npm i -g vercel
   vercel --prod
   ```

### For Netlify

1. **Via Dashboard**
   - Go to https://app.netlify.com
   - Select your site
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"
   - Or push to `main` branch (auto-deploys if configured)

2. **Via CLI**
   ```bash
   npm i -g netlify-cli
   netlify deploy --prod
   ```

### For Other Platforms

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `.next` folder and `public` folder according to your platform's Next.js deployment instructions.

---

## Post-Deployment Verification

### Critical Tests (Do These First)

1. **Homepage**
   - URL: `https://your-domain.com/`
   - Expected: Dashboard loads without errors

2. **Login**
   - URL: `https://your-domain.com/login`
   - Expected: Login form appears, authentication works

3. **Strategic Planning**
   - URL: `https://your-domain.com/strategic-planning`
   - Expected: Strategic Planning page loads with Overview tab

4. **Redirects**
   - URL: `https://your-domain.com/leaders-targets`
   - Expected: Redirects to Strategic Planning (Leader view, Goals tab)
   - URL: `https://your-domain.com/agents-targets`
   - Expected: Redirects to Strategic Planning (Advisor view, Goals tab)

5. **Goal Setting**
   - Navigate to Strategic Planning → Goal Setting tab
   - Expected: Goal form loads, can enter data, can submit

6. **Reports** (Admin only)
   - URL: `https://your-domain.com/reports`
   - Expected: Reports page loads, shows data, New Recruits column visible

7. **Quarterly Summary**
   - Navigate to Reports page
   - Click "Show Summary" on Quarterly Summary section
   - Expected: Table expands, shows Q1-Q4 data
   - Click "Download CSV"
   - Expected: CSV file downloads

### Browser Testing

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Mobile Testing

- [ ] Sidebar navigation works
- [ ] Strategic Planning tabs are accessible
- [ ] Goal Setting form is usable
- [ ] Reports table is scrollable
- [ ] Quarterly Summary is accessible

---

## Monitoring

### First Hour

Monitor these continuously:
- Error logs (Vercel/Netlify dashboard)
- User authentication attempts
- Page load times
- Redirect usage (check analytics)
- Any 404 errors

### First Day

- Check error rate (should not increase)
- Review user feedback
- Monitor redirect usage
- Check goal submission rate
- Verify reports are working

### First Week

- Track adoption of Strategic Planning
- Monitor redirect usage (users migrating)
- Collect user feedback
- Identify any UX issues
- Plan improvements

---

## Troubleshooting

### Build Fails

**Issue:** Build fails with TypeScript errors
**Solution:** 
- Check `npm run type-check` output
- Some pre-existing errors may exist in other files
- Focus on errors in files you modified
- Critical: Strategic Planning files should have no errors

### Redirects Not Working

**Issue:** Old URLs don't redirect
**Solution:**
- Verify redirect pages exist: `app/leaders-targets/page.tsx` and `app/agents-targets/page.tsx`
- Check browser console for errors
- Verify Next.js routing is configured correctly

### Environment Variables Not Working

**Issue:** Firebase connection fails
**Solution:**
- Verify all `NEXT_PUBLIC_*` variables are set
- Check variable names match exactly (case-sensitive)
- Restart deployment after adding variables
- Verify Firebase project ID is correct: `cma-dashboard-01-5a57b`

### Strategic Planning Doesn't Load

**Issue:** Page shows error or blank
**Solution:**
- Check browser console for errors
- Verify Firebase is initialized correctly
- Check authentication is working
- Verify user has proper permissions

---

## Rollback Procedure

### Quick Rollback (< 15 minutes)

**Vercel:**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

**Netlify:**
1. Go to Deploys tab
2. Find previous working deployment
3. Click "..." → "Publish deploy"

**Git-based Rollback:**
```bash
# Revert last commit (if needed)
git revert HEAD

# Or checkout previous commit
git checkout <previous-commit-hash>

# Push to trigger new deployment
git push
```

### When to Rollback

Rollback immediately if:
- Critical functionality broken (login, goal submission)
- Data loss or corruption
- Security vulnerabilities exposed
- Site completely inaccessible
- Multiple users reporting critical errors

---

## Communication

### Pre-Deployment (Optional)

Email to users:
> "We're improving the Strategic Planning system. On [DATE], Leaders/Agents Targets pages will redirect to Strategic Planning for a unified experience."

### Post-Deployment

If issues arise:
1. Assess severity
2. Decide: Fix forward vs. Rollback
3. Communicate with users if needed
4. Document issue and resolution

---

## Success Criteria

✅ Deployment successful (no errors)  
✅ All critical paths working  
✅ Redirects functioning  
✅ No increase in error rate  
✅ Users can access all features  
✅ Reports displaying correctly  
✅ No user complaints about broken functionality  

---

## Additional Resources

- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Detailed checklist
- `DEPLOYMENT_QUICK_START.md` - Quick reference
- `PRE_DEPLOYMENT_VERIFICATION.md` - Pre-flight checks
- `DEPLOYMENT_STRATEGY.md` - Strategic approach
- `IMPLEMENTATION_SUMMARY.md` - What changed

---

## Support

For issues during deployment:
1. Check error logs first
2. Review this documentation
3. Check browser console for client-side errors
4. Verify environment variables
5. Test in development environment
6. Check Firebase console for database issues


