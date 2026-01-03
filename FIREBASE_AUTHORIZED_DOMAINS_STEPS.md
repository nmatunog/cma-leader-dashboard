# Add Vercel Domain to Firebase - Step by Step

## Quick Steps

1. **Go to:** https://console.firebase.google.com/
2. **Select project:** `cma-dashboard-01-5a57b`
3. **Click:** Authentication (left sidebar)
4. **Click:** Settings tab (top)
5. **Scroll to:** "Authorized domains"
6. **Click:** "Add domain"
7. **Enter:** `cma-leader-dashboard.vercel.app`
8. **Click:** "Add"
9. **Also add:** `*.vercel.app` (for preview deployments)
10. **Done!** Try logging in again

## Visual Guide

```
Firebase Console
  └─ Project: cma-dashboard-01-5a57b
      └─ Authentication (left sidebar)
          └─ Settings tab
              └─ Authorized domains section
                  └─ [Add domain] button
                      └─ Enter: cma-leader-dashboard.vercel.app
```

## Why This Fixes It

Firebase blocks authentication requests from unauthorized domains for security. Your Vercel domain needs to be explicitly allowed.

---

**Do this first - it's the most common cause of login failures!**

