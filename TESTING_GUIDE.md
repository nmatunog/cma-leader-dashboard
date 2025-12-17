# Testing Guide: Creating Initial Admin User

This guide will help you test and create the initial admin user account.

## Prerequisites Checklist

Before testing, ensure:

- [ ] Firebase project is created
- [ ] Firebase environment variables are configured in `.env.local` (local) or deployment platform (Netlify/Vercel)
- [ ] Email/Password authentication is enabled in Firebase Console
- [ ] Firestore Database is created
- [ ] Application is running (locally or deployed)

## Step-by-Step Testing

### 1. Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password**
5. Enable it (toggle ON)
6. Click **Save**

### 2. Configure Firestore Rules (for Setup)

For the setup page to work, you need to allow user creation. Update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow creation of users (needed for setup page)
      // This allows anyone to create a user document, but only during initial setup
      allow create: if true;
      // Allow read if authenticated OR if checking for admin (setup scenario)
      allow read: if true; // Temporarily allow reads for setup check
      // Allow update/delete only if authenticated
      allow update, delete: if request.auth != null;
    }
    
    // After setup, you can restrict to authenticated users only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Security Note**: After creating your admin user, update these rules to require authentication for all operations.

### 3. Access Setup Page

**Option A: Local Testing**
1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/setup`

**Option B: Deployed Testing**
1. Navigate to: `https://your-domain.com/setup`

### 4. Create Admin User

1. Fill in the setup form:
   - **Email**: Your admin email (e.g., `admin@cma.com`)
   - **Password**: Secure password (minimum 6 characters)
   - **Full Name**: Your name (e.g., `Admin User`)
   - **Agency Name**: Your agency (e.g., `Cebu Matunog Agency`)

2. Click **"Create Admin Account"**

3. Wait for success message

4. You'll be redirected to `/login` automatically

### 5. Log In with Admin Account

1. On the login page, enter your credentials:
   - Email: The email you just created
   - Password: The password you set

2. Click **"Log In"**

3. You should be redirected to `/reports` (admin default page)

### 6. Verify Admin Access

1. **Check Sidebar**: You should see "User Management" link in the Admin section
2. **Navigate to User Management**: Click on "User Management" in sidebar
3. **Verify User List**: You should see your admin user in the list
4. **Test User Creation**: Try creating a new user via the "Create New User" button

### 7. Create Test Users (Optional)

Test creating different user types:

**Advisor User:**
- Email: `advisor@test.com`
- Password: `test123`
- Role: Advisor
- Rank: LA
- Agency: Cebu Matunog Agency

**Leader User:**
- Email: `leader@test.com`
- Password: `test123`
- Role: Leader
- Rank: UM
- Agency: Cebu Matunog Agency
- Unit Manager: (optional)

### 8. Test Role-Based Access

1. **Log out** from admin account
2. **Log in** as a test advisor user
3. **Verify**: Should redirect to `/strategic-planning` (not `/reports`)
4. **Verify**: Should NOT see "User Management" in sidebar
5. **Verify**: Can access strategic planning features

## Troubleshooting

### Issue: Setup page shows error when creating user

**Possible causes:**
- Email/Password auth not enabled in Firebase Console
- Firestore rules too restrictive
- Firebase environment variables not configured

**Solution:**
1. Check browser console for detailed error
2. Verify Firebase Console settings
3. Check environment variables
4. Review Firestore rules

### Issue: "Failed to create admin user" - Email already exists

**Solution:**
- The email is already in use in Firebase Auth
- Use a different email or delete the existing user from Firebase Console

### Issue: Cannot log in after creating admin

**Possible causes:**
- User document not created in Firestore
- User `isActive` field is `false`
- User `role` field is not `admin`

**Solution:**
1. Check Firestore `users` collection for your user document
2. Verify the document has:
   ```json
   {
     "role": "admin",
     "isActive": true,
     "email": "your-email@example.com"
   }
   ```

### Issue: Setup page redirects immediately

**Cause**: An admin user already exists

**Solution:**
- Log in with existing admin credentials
- Or check Firestore for existing admin users

### Issue: Cannot access `/admin/users` after login

**Possible causes:**
- User role is not `admin`
- User is not authenticated
- Auth context not properly initialized

**Solution:**
1. Check browser console for errors
2. Verify user document in Firestore has `role: "admin"`
3. Check that you're logged in (auth context should show user)

## Security Checklist (After Setup)

After successfully creating your admin user:

- [ ] Update Firestore rules to require authentication for all operations
- [ ] Remove temporary open access rules
- [ ] Test that unauthenticated users cannot access protected routes
- [ ] Verify that non-admin users cannot access admin pages
- [ ] Change default admin password if using a temporary one
- [ ] Enable 2FA for admin accounts (if available in your Firebase plan)

## Post-Setup Firestore Rules

After setup, use these more restrictive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Allow users to read their own profile
      allow read: if request.auth != null && (
        request.auth.uid == userId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      // Only admins can create/update/delete users
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /strategic_planning_goals/{goalId} {
      // Users can read their own goals, admins can read all
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      // Users can create their own goals
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      // Only admins can update/delete goals
      allow update, delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Next Steps

After successful setup and testing:

1. ✅ Create additional users via User Management interface
2. ✅ Test strategic planning goal submission
3. ✅ Verify reports page functionality
4. ✅ Test user roles and permissions
5. ✅ Deploy to production (if not already done)
