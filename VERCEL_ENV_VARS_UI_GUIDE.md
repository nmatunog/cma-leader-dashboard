# How to Select Environments in Vercel

## 📍 Where to Select the 3 Environments

When adding environment variables in Vercel, here's exactly where to find the environment selection:

---

## Step-by-Step: Adding Environment Variables

### Step 1: Access Environment Variables

1. **Go to your Vercel project dashboard**
2. **Click on your project name** (e.g., `cma-leader-dashboard`)
3. **Go to "Settings"** (top navigation bar)
4. **Click "Environment Variables"** (left sidebar, under "Configuration")

### Step 2: Add a New Variable

1. **Click the "Add New" button** (or "Add" button)
2. **A form will appear** with these fields:
   - **Key** (variable name)
   - **Value** (variable value)
   - **Environment** ← **THIS IS WHERE YOU SELECT!**

### Step 3: Select Environments

You'll see **three checkboxes**:

```
☐ Production
☐ Preview  
☐ Development
```

**✅ Select ALL THREE** by checking all boxes:
```
✅ Production
✅ Preview  
✅ Development
```

### Step 4: Save

1. **Click "Save"** button
2. **Repeat** for each of the 6 Firebase variables

---

## Visual Guide

```
┌─────────────────────────────────────────┐
│ Add Environment Variable                │
├─────────────────────────────────────────┤
│ Key:                                    │
│ NEXT_PUBLIC_FIREBASE_API_KEY            │
│                                         │
│ Value:                                  │
│ [your-api-key-here]                    │
│                                         │
│ Environment:                            │
│ ☑ Production                            │  ← Check this
│ ☑ Preview                               │  ← Check this
│ ☑ Development                           │  ← Check this
│                                         │
│ [Cancel]  [Save]                        │
└─────────────────────────────────────────┘
```

---

## Alternative: Adding Multiple Variables

### Option 1: One by One (Recommended)
- Add each variable individually
- Select all 3 environments for each
- Click Save after each one

### Option 2: Bulk Add (Advanced)
- Some Vercel interfaces allow adding multiple at once
- Still need to select environments for each

---

## Important Notes

### What Each Environment Does

- **Production**: Used when deploying to production (main branch)
- **Preview**: Used for preview deployments (pull requests, branches)
- **Development**: Used for local development (if using Vercel CLI)

### Why Select All Three?

✅ **Recommended:** Select all 3 environments so your variables work everywhere:
- Production deployments
- Preview deployments (for testing PRs)
- Local development (if using Vercel CLI)

### Can I Change Later?

✅ **Yes!** You can:
- Edit variables later in Settings → Environment Variables
- Change which environments they apply to
- Add or remove variables anytime

---

## Quick Checklist

For each of the 6 Firebase variables:

1. [ ] Click "Add New"
2. [ ] Enter variable name (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. [ ] Enter variable value
4. [ ] **Check all 3 environments:** Production, Preview, Development
5. [ ] Click "Save"
6. [ ] Repeat for next variable

---

## Troubleshooting

### "I don't see the Environment checkboxes"

**Possible causes:**
- You're in the wrong section (make sure you're in Settings → Environment Variables)
- The form hasn't fully loaded (try refreshing)
- You're using an older Vercel interface (should still have the option)

**Solution:**
- Make sure you clicked "Add New" button first
- The environment selection appears in the form that pops up
- If still not visible, try a different browser or refresh

### "The checkboxes are already selected"

**Good!** Vercel sometimes pre-selects all environments by default. Just verify all 3 are checked before saving.

### "I only want Production environment"

That's fine! Just check only "Production". However, we recommend selecting all 3 for easier testing and development.

---

## After Adding Variables

1. **Trigger a new deployment** (variables are embedded at build time)
2. **Go to Deployments tab**
3. **Click "Redeploy"** on the latest deployment OR
4. **Make a new commit and push** (if auto-deploy is enabled)

---

**That's it! The environment selection checkboxes are right in the form when you click "Add New" for environment variables.**

