# Testing Hardcode Superuser Functionality

## Test Steps

1. **Navigate to Admin Users Page**
   - Go to: `http://localhost:3000/admin/users`
   - Make sure you're logged in as an admin user

2. **Locate the Button**
   - Look for the "🔧 Hardcode Super User" button in the top right area
   - It should be next to the "+ Create New User" button

3. **Click the Button**
   - Click "🔧 Hardcode Super User"
   - A confirmation dialog should appear asking: "Hardcode promote nmatunog@gmail.com to Super User? This will bypass normal permission checks."

4. **Confirm the Action**
   - Click "OK" in the confirmation dialog
   - The button should show "Promoting..." while processing

5. **Verify Success**
   - An alert should appear with a success message
   - The user list should refresh automatically
   - Check that nmatunog@gmail.com now shows role as "Super User"

6. **Verify in Firestore (Optional)**
   - Go to Firebase Console → Firestore Database
   - Find the user document for nmatunog@gmail.com
   - Verify that `role` field is set to `"superuser"`
   - Verify that `rank` field is set to `"ADMIN"`

## Expected Results

✅ Button is visible on the Admin Users page
✅ Confirmation dialog appears when clicked
✅ Success message appears after promotion
✅ User role is updated to "superuser" in Firestore
✅ User can now create/assign admin and superuser roles

## Troubleshooting

If the button doesn't appear:
- Check browser console for errors
- Verify you're on the `/admin/users` page
- Check that the file was saved correctly

If the API call fails:
- Check browser console for error messages
- Check server logs for detailed error information
- Verify Firebase is properly configured
- Verify the user nmatunog@gmail.com exists in Firestore
