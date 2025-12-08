# Netlify Environment Variables Checklist

## ✅ Required Variables (All must be set)

Copy these **exact** variable names to Netlify:

1. ✅ `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: `AIzaSyB-O0OCE5tvs5gXwcMKXvhnEM_GhBQtSCU`

2. ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - Value: `cma-leader-dashboard.firebaseapp.com`

3. ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Value: `cma-leader-dashboard`

4. ✅ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - Value: `cma-leader-dashboard.firebasestorage.app`

5. ✅ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - Value: `214624637758`

6. ✅ `NEXT_PUBLIC_FIREBASE_APP_ID` ⚠️ **CHECK SPELLING!**
   - Value: `1:214624637758:web:1982fcfbc796f866dad26f`
   - **Common mistake**: `EXT_PUBLIC_FIREBASE_APP_ID` (missing "N") ❌
   - **Correct**: `NEXT_PUBLIC_FIREBASE_APP_ID` (with "N") ✅

## ⚠️ Common Mistakes

### ❌ Wrong Variable Names (DO NOT USE):
- `EXT_PUBLIC_FIREBASE_APP_ID` (missing "N")
- `NEXT_PUBLIC_FIREBASE_APPID` (missing underscore)
- `NEXT_PUBLIC_FIREBASE_APP_ID_` (trailing underscore)

### ✅ Correct Variable Name:
- `NEXT_PUBLIC_FIREBASE_APP_ID` (exact spelling)

## How to Verify in Netlify

1. Go to **Site settings** → **Environment variables**
2. Check that you have exactly **6 variables** (or 7 if including measurementId)
3. Verify each variable name matches **exactly** (case-sensitive)
4. If you see `EXT_PUBLIC_FIREBASE_APP_ID`, **delete it** and add `NEXT_PUBLIC_FIREBASE_APP_ID` instead

## Quick Fix Steps

1. **Delete** any variable named `EXT_PUBLIC_FIREBASE_APP_ID`
2. **Add** variable named `NEXT_PUBLIC_FIREBASE_APP_ID` with value `1:214624637758:web:1982fcfbc796f866dad26f`
3. **Trigger new deploy**
4. **Check build log** - should show ✅ for all 6 variables

