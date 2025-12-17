# Initial Setup Instructions

This guide will help you set up the initial admin user account for the CMA Leader Performance Dashboard.

## Prerequisites

1. **Firebase Project Setup**
   - Firebase project created in [Firebase Console](https://console.firebase.google.com)
   - Firebase environment variables configured in your deployment platform (Netlify/Vercel) or `.env.local` file

2. **Enable Email/Password Authentication**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" provider
   - Save changes

3. **Configure Firestore Security Rules**

   For initial setup, you may need to temporarily allow unauthenticated access to check for existing admin users, or use the setup page.

   Current rules (in `FIRESTORE_RULES.md`):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         // Allow read if authenticated (for checking admin existence)
         allow read: if request.auth != null;
         // Allow write only for authenticated users (admin will create via setup page)
         // For initial setup, you may temporarily allow writes, then restrict after setup
         allow write: if request.auth != null;
       }
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   **Note**: For the setup page to work, you need to either:
   - Temporarily allow unauthenticated reads to the `users` collection during setup
   - Or manually create the first admin user via Firebase Console (see Option 2 below)

## Option 1: Use Setup Page (Recommended)

1. **Deploy the application** or run it locally
2. **Navigate to** `/setup` in your browser
3. **Fill in the form** with:
   - Email: Your admin email (e.g., `admin@cma.com`)
   - Password: Secure password (minimum 6 characters)
   - Name: Your full name
   - Agency Name: Your agency name (e.g., "Cebu Matunog Agency")
4. **Click "Create Admin Account"**
5. **You'll be redirected to login** - use the credentials you just created

## Option 2: Create via Firebase Console

If the setup page doesn't work due to Firestore security rules, you can create the first admin user manually:

1. **Go to Firebase Console** → Authentication → Users
2. **Click "Add user"**
3. **Enter email and password** for your admin account
4. **Click "Add user"**

5. **Go to Firestore Database** → Data
6. **Create a new collection** called `users`
7. **Create a document** with the user's UID (copy from Authentication users list)
8. **Add the following fields**:
   ```json
   {
     "email": "admin@cma.com",
     "name": "Admin User",
     "role": "admin",
     "rank": "ADMIN",
     "agencyName": "Cebu Matunog Agency",
     "isActive": true,
     "createdAt": [Firestore Timestamp],
     "updatedAt": [Firestore Timestamp],
     "createdBy": "system"
   }
   ```

9. **Update the user's display name** in Firebase Auth:
   - Go to Authentication → Users
   - Click on the user
   - Edit the Display name field
   - Save

## Option 3: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Login to Firebase
firebase login

# Use Firebase Auth:users:create (if available) or use Admin SDK
# Or use the setup page after deployment
```

## After Setup

1. **Log in** with your admin credentials at `/login`
2. **Verify access** to `/admin/users` page
3. **Create additional users** via the User Management interface
4. **Update Firestore security rules** if you temporarily allowed unauthenticated access

## Troubleshooting

### "Failed to create admin user" error

- Check that Email/Password authentication is enabled in Firebase Console
- Verify Firebase environment variables are correctly configured
- Check browser console for detailed error messages
- Ensure Firestore rules allow user creation (may need temporary write access)

### Setup page redirects immediately

- An admin user already exists
- Check Firestore `users` collection for existing admin accounts
- Log in with existing admin credentials

### Cannot access admin pages after login

- Verify the user document in Firestore has `role: "admin"`
- Check that `isActive: true` in the user document
- Ensure you're logged in with the correct account

## Security Notes

- After creating the initial admin, restrict Firestore rules to require authentication
- Never commit Firebase credentials or environment variables to version control
- Use strong passwords for admin accounts
- Consider enabling 2FA for admin accounts (if supported by your Firebase plan)
- Regularly review and audit user accounts

## Next Steps

After creating your admin account:

1. ✅ Log in and verify admin access
2. ✅ Create additional users via User Management (`/admin/users`)
3. ✅ Review and update Firestore security rules
4. ✅ Test user authentication flows
5. ✅ Configure additional Firebase services as needed

