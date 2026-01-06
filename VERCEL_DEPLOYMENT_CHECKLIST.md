# Vercel Deployment - Quick Checklist

## ✅ Pre-Deployment (5 minutes)

- [ ] Code pushed to GitHub (`git push`)
- [ ] All environment variables set in Vercel dashboard
- [ ] Verified `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `cma-dashboard-01-5a57b`
- [ ] Build command verified: `npm run build`

## 🚀 Deployment (2 minutes)

- [ ] Push to `main` branch (auto-deploys) OR
- [ ] Use Vercel dashboard: Deployments → Deploy to Production

## ✅ Post-Deployment Verification (10 minutes)

### Critical Tests
- [ ] Homepage loads: `https://your-domain.vercel.app/`
- [ ] Login works: `/login`
- [ ] Sidebar shows Strategic Planning (no Targets)
- [ ] Redirect `/leaders-targets` → Strategic Planning
- [ ] Redirect `/agents-targets` → Strategic Planning
- [ ] Strategic Planning loads: `/strategic-planning`
- [ ] Goal Setting works
- [ ] Reports page loads (admin)
- [ ] New Recruits column visible
- [ ] Quarterly Summary expands/collapses
- [ ] CSV download works

### Browser Tests
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (iOS/Android)

## 📊 Monitoring (First Hour)

- [ ] Check Vercel logs (no critical errors)
- [ ] Monitor redirect usage
- [ ] Verify no 404 errors
- [ ] Check page load times
- [ ] Test user authentication

## 🎯 Success Criteria

- ✅ No critical errors
- ✅ All features working
- ✅ Redirects functioning
- ✅ User authentication working
- ✅ Reports displaying correctly

---

**Status:** Ready to deploy!  
**Platform:** Vercel  
**See:** `VERCEL_DEPLOYMENT_GUIDE.md` for detailed steps



