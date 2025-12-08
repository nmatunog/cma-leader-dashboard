# Production Deployment Guide

This guide covers the steps to deploy the CMA Leader Performance Dashboard to production.

## Prerequisites

- Node.js 18+ installed
- Firebase project configured
- Google Sheets configured and shared properly
- Environment variables set up

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure all required environment variables are set in your production environment:

```bash
# Copy .env.example to .env.production.local and fill in values
cp .env.example .env.production.local
```

Required variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional, for Analytics)

### 2. Firebase Configuration

1. **Firestore Database**
   - Ensure Firestore is enabled in Firebase Console
   - Set up proper security rules (see Firebase Security Rules section)
   - Create the `data` collection structure

2. **Firebase Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /data/{document=**} {
         allow read, write: if request.auth != null; // Adjust based on your auth needs
       }
       match /strategic_planning_goals/{goalId} {
         allow read: if true; // Public read for agency goals
         allow write: if true; // Adjust based on your security needs
       }
     }
   }
   ```

### 3. Google Sheets Setup

- Ensure all Google Sheets are published as CSV
- Verify sharing permissions are correct
- Test sheet URLs are accessible

### 4. Build and Test

```bash
# Install dependencies
npm install

# Run production build locally
npm run build

# Test production build
npm start

# Run linting
npm run lint
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Push code to GitHub/GitLab/Bitbucket
   - Import project in Vercel

2. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all Firebase environment variables
   - Set for Production, Preview, and Development

3. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Or manually deploy from dashboard

4. **Custom Domain** (Optional)
   - Add custom domain in Project Settings > Domains

### Option 2: Netlify

#### Prerequisites
- Netlify account (free tier available)
- GitHub/GitLab/Bitbucket repository with your code

#### Step-by-Step Deployment

1. **Prepare Your Repository**
   - Ensure `netlify.toml` is committed to your repository
   - Ensure `.env.example` is committed (for reference)
   - Ensure `.gitignore` excludes `.env*` files

2. **Connect Repository to Netlify**
   - Log in to [Netlify](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**
   Netlify will auto-detect Next.js, but verify:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` (or leave empty, Netlify handles it)
   - **Node version**: 18 (set in `netlify.toml`)

4. **Set Environment Variables**
   - Go to Site settings > Environment variables
   - Add each Firebase environment variable:
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (optional)
     ```
   - Set for "All scopes" (Production, Deploy previews, Branch deploys)

5. **Install Netlify Next.js Plugin** (Recommended)
   - Go to Site settings > Plugins
   - Search for "@netlify/plugin-nextjs"
   - Click "Install"
   - This plugin optimizes Next.js deployments on Netlify

6. **Deploy**
   - Click "Deploy site"
   - Netlify will run the build and deploy
   - Wait for deployment to complete

7. **Configure Custom Domain** (Optional)
   - Go to Site settings > Domain management
   - Click "Add custom domain"
   - Follow instructions to configure DNS

#### Netlify-Specific Configuration

The `netlify.toml` file includes:
- Build command and publish directory
- Security headers
- Cache headers for static assets
- Redirects for Next.js App Router

#### Troubleshooting Netlify Deployment

**Build Fails:**
- Check build logs in Netlify dashboard
- Verify all environment variables are set
- Ensure Node.js version is 18+
- Check `netlify.toml` configuration

**Runtime Errors:**
- Check function logs in Netlify dashboard
- Verify Firebase environment variables
- Check browser console for client-side errors

**Performance Issues:**
- Enable Next.js plugin: `@netlify/plugin-nextjs`
- Check cache headers configuration
- Review bundle size in build output

#### Netlify Functions (if needed)

If you need serverless functions, create them in `netlify/functions/`:
```
netlify/
  functions/
    api/
      hello.ts
```

#### Continuous Deployment

Netlify automatically deploys on:
- Push to main branch (production)
- Pull requests (deploy previews)
- Other branches (branch deploys)

Configure in Site settings > Build & deploy > Continuous deployment.

#### AWS Amplify
- Build settings:
  - Build command: `npm run build`
  - Output directory: `.next`

#### Docker
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

## Post-Deployment

### 1. Verify Deployment

- [ ] Application loads correctly
- [ ] Firebase connection works
- [ ] Google Sheets sync works
- [ ] Strategic Planning section functions
- [ ] PDF generation works
- [ ] All forms submit correctly

### 2. Performance Monitoring

- Monitor Firebase usage and quotas
- Check application performance metrics
- Set up error tracking (e.g., Sentry)

### 3. Security

- Review Firebase Security Rules
- Ensure HTTPS is enabled
- Review and update CORS settings if needed
- Regular security audits

### 4. Backup Strategy

- Regular Firestore backups
- Version control for code
- Document configuration changes

## Troubleshooting

### Build Errors

1. **Missing Environment Variables**
   - Ensure all `NEXT_PUBLIC_*` variables are set
   - Check variable names match exactly

2. **Firebase Connection Issues**
   - Verify Firebase project ID matches
   - Check API keys are correct
   - Ensure Firestore is enabled

3. **Module Not Found**
   - Run `npm install` to ensure all dependencies are installed
   - Check `package.json` for missing dependencies

### Runtime Errors

1. **Firebase Permission Denied**
   - Review Firestore security rules
   - Check authentication setup

2. **Google Sheets Not Loading**
   - Verify sheet URLs are correct
   - Check sheet sharing permissions
   - Ensure CSV export is enabled

## Maintenance

### Regular Updates

- Keep dependencies updated: `npm update`
- Review security advisories
- Update Firebase SDK when available
- Monitor for breaking changes in Next.js

### Monitoring

- Set up application monitoring
- Track error rates
- Monitor Firebase usage
- Review user feedback

## Support

For issues or questions:
1. Check logs in deployment platform
2. Review Firebase Console for errors
3. Check browser console for client-side errors
4. Review this documentation

## Version History

- v0.1.0 - Initial production release
  - Strategic Planning module
  - Dashboard metrics
  - Google Sheets integration
  - PDF generation

