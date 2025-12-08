# Netlify Quick Start Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Push to Git
```bash
git add .
git commit -m "Ready for Netlify deployment"
git push origin main
```

### Step 2: Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** > **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository

### Step 3: Configure Build

Netlify auto-detects Next.js, but verify:
- **Build command**: `npm run build`
- **Publish directory**: `.next` (or leave empty)

### Step 4: Add Environment Variables

Go to **Site settings** > **Environment variables** and add:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Set scope to "All scopes"** for each variable.

### Step 5: Install Next.js Plugin (Important!)

1. Go to **Site settings** > **Plugins**
2. Search for **"@netlify/plugin-nextjs"**
3. Click **"Install"**

This plugin is essential for Next.js to work properly on Netlify.

### Step 6: Deploy

Click **"Deploy site"** and wait 2-5 minutes.

Your site will be live at: `https://your-site-name.netlify.app`

## ✅ Verify Deployment

After deployment, check:
- [ ] Site loads: `https://your-site-name.netlify.app`
- [ ] Dashboard displays
- [ ] Firebase works (check browser console)
- [ ] No errors in Netlify function logs

## 🔧 Troubleshooting

**Build fails?**
- Check build logs in Netlify dashboard
- Verify all environment variables are set
- Ensure `@netlify/plugin-nextjs` is installed

**Site loads but Firebase errors?**
- Double-check environment variable values
- Verify Firebase project ID matches
- Check browser console for specific errors

**404 errors?**
- Ensure `@netlify/plugin-nextjs` plugin is installed
- Check `netlify.toml` configuration

## 📚 Full Documentation

See `NETLIFY_DEPLOYMENT.md` for detailed instructions.

## 🎯 Next Steps

- [ ] Set up custom domain (optional)
- [ ] Configure branch deploys
- [ ] Set up monitoring
- [ ] Enable analytics

---

**Need help?** Check Netlify dashboard logs or see `NETLIFY_DEPLOYMENT.md`.

