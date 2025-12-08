# Fix Netlify Base Directory Error

## The Problem
Netlify was trying to use `/opt/build` as the base directory, which is an absolute path that doesn't exist. Netlify requires relative paths.

## The Solution
I've added `netlify.toml` with `base = "."` which sets the base directory to the repository root.

## Also Check Netlify UI

Even with netlify.toml, you should also verify the Netlify UI settings:

1. Go to **Site settings** > **Build & deploy** > **Build settings**
2. Click **"Edit settings"**
3. Check the **"Base directory"** field:
   - It should be **EMPTY** (blank)
   - OR set to `.` (dot)
   - **DO NOT** use absolute paths like `/opt/build`
4. Save the settings

## Build Settings Should Be:

- **Base directory**: Empty or `.`
- **Build command**: `npm run build`
- **Publish directory**: `.next`

The netlify.toml file will override UI settings, so the build should work now.

