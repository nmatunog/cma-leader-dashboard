# Firebase Configuration Status

## Current Status

✅ **Code Structure**: Firebase is properly configured in the code
- ✅ `lib/firebase.ts` correctly reads from environment variables
- ✅ Lazy initialization implemented
- ✅ No compilation errors

⚠️ **Environment Variables**: Need to be set up

## Required Environment Variables

You need to create a `.env.local` file in the `cma-dashboard` directory with your Firebase credentials.

### Step 1: Get Firebase Credentials

From your existing `PerfSegment.html` file, I can see you have Firebase credentials:
- Project ID: `cma-dashboard-01`
- API Key: `AIzaSyA4ypSYff_MJssdgnN_OE9qV-KBoZUSmiA`
- Auth Domain: `cma-dashboard-01.firebaseapp.com`
- Storage Bucket: `cma-dashboard-01.firebasestorage.app`
- Messaging Sender ID: `895019991460`
- App ID: `1:895019991460:web:6e3557a3198539c2cf4131`
- Measurement ID: `G-V69KQD2HGD`

### Step 2: Create `.env.local` File

Create a file named `.env.local` in the `cma-dashboard` directory:

```bash
cd cma-dashboard
touch .env.local
```

### Step 3: Add Your Firebase Configuration

Copy the template from `.env.local.example` and fill in your values:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA4ypSYff_MJssdgnN_OE9qV-KBoZUSmiA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cma-dashboard-01.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cma-dashboard-01
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cma-dashboard-01.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=895019991460
NEXT_PUBLIC_FIREBASE_APP_ID=1:895019991460:web:6e3557a3198539c2cf4131
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-V69KQD2HGD

# Edit Mode Password
NEXT_PUBLIC_EDIT_PASSWORD=cma2025
```

### Step 4: Restart Development Server

After creating `.env.local`, restart your dev server:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Verification

To verify Firebase is working:

1. **Check Browser Console**: Open DevTools (F12) and look for:
   - ✅ No Firebase errors
   - ✅ Successful connection messages

2. **Test Data Loading**: 
   - Go to Dashboard page
   - Check if data loads (or shows "No data" if Firebase is empty)

3. **Test Data Saving**:
   - Enable Edit Mode
   - Edit a metric
   - Check Firebase Console to see if data was saved

## Firestore Database Structure

The app expects this structure in Firestore:

```
/data/
  ├── dashboard/          # Main dashboard data
  │   ├── trackingData    # Leaders array
  │   ├── agentsData      # Agents array
  │   ├── agencyAnpTarget
  │   └── agencyRecruitsTarget
  │
  ├── agency-summary/     # Agency summary metrics
  │   ├── totalAnpMtd
  │   ├── totalFypMtd
  │   ├── persistencyMtd
  │   └── ... (all MTD/YTD metrics)
  │
  └── sheets-config/      # Google Sheets configuration
      ├── agency
      ├── leaders
      └── agents
```

## Firestore Security Rules

For development/testing, you can use open rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Important**: Restrict these rules in production!

## Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"
- **Solution**: Check that `NEXT_PUBLIC_FIREBASE_API_KEY` is correct in `.env.local`
- **Note**: Restart dev server after changing `.env.local`

### Error: "Firebase: Error (app/no-app)"
- **Solution**: Ensure all Firebase env variables are set
- **Check**: All `NEXT_PUBLIC_FIREBASE_*` variables are present

### Data Not Loading
- **Check**: Firestore database exists and has data
- **Check**: Security rules allow read access
- **Check**: Browser console for specific error messages

### Data Not Saving
- **Check**: Edit mode is enabled
- **Check**: Security rules allow write access
- **Check**: Browser console for errors

## Next Steps

1. ✅ Create `.env.local` file with your Firebase credentials
2. ✅ Restart dev server
3. ✅ Verify Firebase connection in browser console
4. ✅ Test loading/saving data
5. ✅ Configure Google Sheets in Settings page

