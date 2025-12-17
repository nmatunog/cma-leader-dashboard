# Update .env.local with New Firebase Config

## Your New Firebase Configuration

Copy and paste this into your `.env.local` file (replace all existing Firebase variables):

```env
# Firebase Configuration - NEW PROJECT (cma-dashboard-01-5a57b)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDLYqhh2130q4Ld40OmdfuZWmMesdjKYoI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cma-dashboard-01-5a57b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cma-dashboard-01-5a57b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cma-dashboard-01-5a57b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=897588150614
NEXT_PUBLIC_FIREBASE_APP_ID=1:897588150614:web:3cf0ac189b8c57379556f7
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-QQRL7GW1PH

# Edit Mode Password
NEXT_PUBLIC_EDIT_PASSWORD=cma2025
```

## Steps to Update

1. **Open `.env.local`** in your project root (same folder as `package.json`)

2. **Replace all the Firebase variables** with the new values above

3. **Save the file**

4. **The dev server has already been stopped and cache cleared**

5. **Restart the dev server**:
   ```bash
   npm run dev
   ```

6. **Check terminal output** - You should see:
   ```
   - Environments: .env.local
   ```

7. **Hard refresh your browser**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

8. **Test**: Visit `http://localhost:3000/test-env` to verify all variables are loaded

## Next Steps After Updating

1. **Enable Email/Password Authentication** in Firebase Console
2. **Create Firestore Database** (if not already done)
3. **Set Firestore security rules** (see FIREBASE_NEW_PROJECT_SETUP.md)
4. **Test the setup page**: `http://localhost:3000/setup`

