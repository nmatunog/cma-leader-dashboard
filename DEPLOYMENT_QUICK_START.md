# Quick Start: Production Deployment Guide

## Pre-Deployment (5 minutes)

### 1. Verify Code Status
```bash
# Check git status
git status

# Verify all changes are committed
git log --oneline -5

# Verify build works
npm run build
```

### 2. Verify Environment Variables
Ensure these are set in your production environment (Vercel/Netlify/etc.):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 3. Verify Firebase Configuration
- [ ] Firestore security rules deployed
- [ ] Database connected and accessible
- [ ] Authentication enabled
- [ ] Test account available

---

## Deployment (Platform-Specific)

### Vercel
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy to production
vercel --prod

# Or use Vercel dashboard: https://vercel.com/dashboard
# → Select project → Deployments → Promote to Production
```

### Netlify
```bash
# Install Netlify CLI (if not installed)
npm i -g netlify-cli

# Deploy to production
netlify deploy --prod

# Or use Netlify dashboard: https://app.netlify.com
# → Select site → Deploys → Trigger deploy
```

### Manual/Other Platforms
```bash
# Build production bundle
npm run build

# The output will be in the .next folder
# Follow your hosting platform's instructions for deploying Next.js apps
```

---

## Post-Deployment Verification (10 minutes)

### Quick Smoke Tests
1. **Homepage** → Should load without errors
2. **Login** → Should authenticate successfully
3. **Sidebar** → Should show Strategic Planning (no Leaders/Agents Targets)
4. **Strategic Planning** → Should load correctly
5. **Redirects** → Test `/leaders-targets` and `/agents-targets` redirects
6. **Goal Setting** → Should allow goal entry/submission
7. **Reports** → Should display data with New Recruits column
8. **Quarterly Summary** → Should expand/collapse and download CSV

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (iOS/Android)

---

## Monitoring Checklist (First Hour)

- [ ] Check error logs (no critical errors)
- [ ] Verify redirect usage (check analytics)
- [ ] Monitor user activity
- [ ] Check page load times
- [ ] Verify no 404 errors
- [ ] Test on mobile devices

---

## Quick Rollback (If Needed)

### Vercel
```bash
# List recent deployments
vercel list

# Promote previous deployment
vercel promote <deployment-url>

# Or use dashboard: Deployments → Select previous → Promote
```

### Netlify
```bash
# List deployments
netlify deploy:list

# Rollback to previous
netlify rollback

# Or use dashboard: Deploys → Select previous → Publish deploy
```

---

## Emergency Contacts

- **Technical Issues:** Check error logs first
- **User Support:** Direct users to Strategic Planning
- **Data Issues:** Check Firestore console

---

## Success Criteria

✅ No critical errors in logs  
✅ All pages load correctly  
✅ Redirects working  
✅ User authentication working  
✅ Goal submission working  
✅ Reports displaying data  
✅ No increase in support tickets  

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Watch error logs and user feedback
2. **Collect metrics** - Track redirect usage, adoption rates
3. **User communication** - Send announcement if needed
4. **Gather feedback** - Plan improvements based on user experience


