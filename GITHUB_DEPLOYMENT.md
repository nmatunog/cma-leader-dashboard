# GitHub & Netlify Deployment Guide

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right > **"New repository"**
3. Repository name: `cma-leader-dashboard` (or your preferred name)
4. Description: "CMA Leader Performance Dashboard with Strategic Planning"
5. Set to **Public** or **Private** (your choice)
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **"Create repository"**

## Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd "/Users/nmatunog2/1CMA_Learning_Hub/CMA Leader Performance Dashboard/cma-dashboard"

# Add remote (replace YOUR_USERNAME and REPO_NAME with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Netlify

### Option A: Via Netlify Dashboard (Recommended)

1. **Go to Netlify**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Sign in or create account

2. **Import Repository**
   - Click **"Add new site"** > **"Import an existing project"**
   - Connect your Git provider (GitHub)
   - Authorize Netlify to access your repositories
   - Select your repository: `cma-leader-dashboard`

3. **Configure Build Settings**
   - **Base directory**: `cma-dashboard` (if repo root is parent) or leave empty
   - **Build command**: `npm run build`
   - **Publish directory**: `.next` (or leave empty - Netlify handles it)

4. **Set Environment Variables**
   - Click **"Show advanced"** or go to **Site settings** > **Environment variables**
   - Add each Firebase variable:
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (optional)
     ```
   - Set **Scope** to **"All scopes"** for each variable

5. **Install Next.js Plugin**
   - Go to **Site settings** > **Plugins**
   - Search for **"@netlify/plugin-nextjs"**
   - Click **"Install"**

6. **Deploy**
   - Click **"Deploy site"**
   - Wait 2-5 minutes for build to complete
   - Your site will be live at: `https://your-site-name.netlify.app`

### Option B: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
cd "/Users/nmatunog2/1CMA_Learning_Hub/CMA Leader Performance Dashboard/cma-dashboard"
netlify deploy --prod
```

## Step 4: Verify Deployment

After deployment:

- [ ] Site loads: `https://your-site-name.netlify.app`
- [ ] Dashboard displays correctly
- [ ] Firebase connection works (check browser console)
- [ ] Strategic Planning section functions
- [ ] No errors in Netlify function logs

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify all environment variables are set
- Ensure `@netlify/plugin-nextjs` is installed

### Site Loads but Firebase Errors
- Double-check environment variable values
- Verify Firebase project ID matches
- Check browser console for specific errors

### 404 Errors
- Ensure `@netlify/plugin-nextjs` plugin is installed
- Check `netlify.toml` configuration

## Next Steps

- Set up custom domain (optional)
- Configure branch deploys for staging
- Set up monitoring and analytics
- Enable form handling if needed

---

**Need Help?** See `NETLIFY_DEPLOYMENT.md` for detailed instructions.

