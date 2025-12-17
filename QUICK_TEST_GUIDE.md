# Quick Testing Guide

## 🚀 Start Testing Now

Your dev server is running on **http://localhost:3000**

---

## Step 1: Create Your First Admin User

1. **Open your browser** and go to: `http://localhost:3000/setup`

2. **Fill in the form**:
   - **Email**: `admin@test.com` (or your preferred email)
   - **Password**: `test123456` (minimum 6 characters)
   - **Name**: `Test Admin` (or your name)
   - **Agency Name**: `Cebu Matunog Agency`

3. **Click "Create Admin Account"**

4. **Expected Result**:
   - ✅ Success message appears
   - ✅ Automatically redirects to `/login`

---

## Step 2: Test Login

1. **You should be on the login page** (`http://localhost:3000/login`)

2. **Log in** with the credentials you just created:
   - Email: `admin@test.com`
   - Password: `test123456`

3. **Click "Log In"**

4. **Expected Result**:
   - ✅ Successfully logs in
   - ✅ Redirects to `/reports` (admin default page)
   - ✅ Sidebar shows your name and "admin" role

---

## Step 3: Test Admin User Management

1. **In the sidebar**, click **"User Management"** (should be in Admin section)

2. **Verify**:
   - ✅ Page loads at `/admin/users`
   - ✅ Your admin user appears in the user list table

3. **Create a Test User**:
   - Click **"+ Create New User"** button
   - Fill in:
     - Email: `advisor@test.com`
     - Password: `test123456`
     - Name: `Test Advisor`
     - Role: `Advisor`
     - Agency: `Cebu Matunog Agency`
   - Click **"Create User"**

4. **Verify**:
   - ✅ New user appears in the table
   - ✅ User has correct role and rank

---

## Step 4: Test Role-Based Access

### Test as Advisor

1. **Logout** (click "Exit" button or logout)

2. **Login as Advisor**: `advisor@test.com` / `test123456`

3. **Expected**:
   - ✅ Redirects to `/strategic-planning` (not `/reports`)
   - ✅ Sidebar does NOT show "User Management"
   - ✅ Cannot access `/admin/users` (will redirect to login)

### Test Strategic Planning as Advisor

1. **Navigate to Goals tab** (if not already there)

2. **Fill in some test goal data**

3. **Click "Submit Goals & Generate PDF"**

4. **Verify**:
   - ✅ Success message appears
   - ✅ PDF downloads
   - ✅ Goal saved to Firestore (check Firebase Console)

---

## Step 5: Test Reports (Admin Only)

1. **Logout and login as Admin** again

2. **Navigate to Reports** (`/reports`)

3. **Verify**:
   - ✅ Page loads
   - ✅ Shows submitted goals
   - ✅ Filters work
   - ✅ Can export CSV

---

## ✅ Quick Verification Checklist

- [ ] Setup page works - created admin user
- [ ] Login works - can log in with admin
- [ ] User Management works - can create new users
- [ ] Role-based access works - advisors can't access admin pages
- [ ] Strategic Planning works - can submit goals
- [ ] Reports page works - shows submitted goals
- [ ] Logout works - can log out and back in

---

## 🐛 Troubleshooting

### "Firebase is not initialized" error
- Check `.env.local` file has all Firebase variables
- Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### Cannot create user
- Check Firebase Console → Authentication → Sign-in method
- Ensure Email/Password is enabled

### Page redirects immediately
- Check browser console for errors
- Verify Firebase configuration

### User Management page not accessible
- Ensure you're logged in as admin (not advisor/leader)
- Check user document in Firestore has `role: "admin"`

---

## 📋 Full Testing

For comprehensive testing, see `TESTING_CHECKLIST.md`

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. Review `DEPLOYMENT_GUIDE.md`
2. Deploy to Vercel or Firebase Hosting
3. Test in production environment
4. Create production admin user

