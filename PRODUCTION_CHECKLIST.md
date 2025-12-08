# Production Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Code Quality
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run type-check` - no TypeScript errors
- [ ] All tests pass (if applicable)
- [ ] Code review completed
- [ ] No console.log statements in production code (or properly handled)

### Configuration
- [ ] All environment variables documented in `.env.example`
- [ ] Production environment variables configured
- [ ] Firebase project configured for production
- [ ] Firebase Security Rules reviewed and updated
- [ ] Google Sheets URLs verified and accessible
- [ ] CORS settings configured (if needed)

### Build
- [ ] `npm run build` completes successfully
- [ ] `npm start` runs without errors
- [ ] No build warnings (or acceptable warnings documented)
- [ ] Bundle size is acceptable
- [ ] All assets load correctly

### Functionality Testing
- [ ] Dashboard loads and displays data
- [ ] Google Sheets sync works
- [ ] Strategic Planning section functions
- [ ] Login/logout works
- [ ] PDF generation works
- [ ] Form submissions work
- [ ] All tabs/navigation work
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Error handling works correctly

### Security
- [ ] Environment variables are secure (not in code)
- [ ] Firebase Security Rules are restrictive
- [ ] No sensitive data exposed in client-side code
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Input validation in place

### Performance
- [ ] Page load times acceptable
- [ ] Images optimized
- [ ] Code splitting working
- [ ] Caching configured
- [ ] Firebase queries optimized

## Deployment

### Platform Setup
- [ ] Deployment platform configured
- [ ] Environment variables set in platform
- [ ] Build command configured
- [ ] Output directory configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate configured

### Post-Deployment
- [ ] Application accessible via URL
- [ ] All pages load correctly
- [ ] Firebase connection works
- [ ] Google Sheets sync works
- [ ] No console errors in browser
- [ ] Performance metrics acceptable
- [ ] Error tracking configured

### Monitoring
- [ ] Error tracking set up (e.g., Sentry)
- [ ] Analytics configured (if applicable)
- [ ] Uptime monitoring configured
- [ ] Firebase usage monitoring enabled
- [ ] Log aggregation set up

### Documentation
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide updated
- [ ] User documentation updated (if applicable)

## Rollback Plan
- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Database backup strategy in place

## Sign-off
- [ ] Technical lead approval
- [ ] QA approval
- [ ] Product owner approval

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Version:** _______________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

