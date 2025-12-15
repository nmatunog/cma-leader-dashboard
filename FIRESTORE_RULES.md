# Firestore Security Rules

## Rules for Firebase Authentication

Since we've added Firebase Authentication (Anonymous Auth), update your Firestore rules to require authentication.

## Step 1: Enable Anonymous Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`cma-leader-dashboard`)
3. Go to **Authentication** in the left sidebar
4. Click **Get started** (if not already enabled)
5. Click on the **Sign-in method** tab
6. Find **Anonymous** in the list
7. Click on it and **Enable** it
8. Click **Save**

## Step 2: Update Firestore Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the existing rules with the code below
3. Click **Publish**

## Security Rules (Require Authentication)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Require authentication for all operations
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## What These Rules Do

- **`request.auth != null`** - Requires the user to be authenticated (signed in)
- Since we use Anonymous Authentication, users will be authenticated when they log in
- This prevents unauthorized access to your Firestore database

## Testing

After updating the rules:
1. Users must sign in (via the login modal) before accessing Firebase features
2. Unauthenticated requests will be denied
3. All authenticated users can read/write (with Anonymous Auth, all users are authenticated)

## Future Improvements

For better security, you could:
- Add role-based rules (admin, leader, advisor)
- Restrict certain collections to specific roles
- Add data validation rules
- Implement email/password authentication instead of anonymous

## Current Collections Used

- `strategic_planning_goals` - Goal submissions
- `data` - Dashboard data
- `config` - Configuration settings

All collections now require authentication to access.

