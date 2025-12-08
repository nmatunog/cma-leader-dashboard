# Admin Credentials

## Default Admin Credentials

**Username:** `admin`  
**Password:** `1CMA2026Admin!`

## Changing Admin Credentials

### For Production (Recommended)

Set environment variables in Netlify:

1. Go to **Netlify Dashboard** → Your site
2. **Site settings** → **Environment variables**
3. Add these variables:
   - `NEXT_PUBLIC_ADMIN_USERNAME` = (your admin username)
   - `NEXT_PUBLIC_ADMIN_PASSWORD` = (your admin password)
4. **Trigger a new deploy** after adding variables

### For Local Development

Create or update `.env.local` file:

```env
NEXT_PUBLIC_ADMIN_USERNAME=your_admin_username
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

## Security Notes

⚠️ **Important:**
- Default credentials are for development only
- **Change credentials before production deployment**
- Use strong, unique passwords
- Never commit credentials to Git
- Environment variables are embedded in the client bundle (NEXT_PUBLIC_*), so they're visible in the browser
- For stronger security, consider implementing server-side authentication

## Accessing Admin Features

1. Go to Strategic Planning section
2. Click "Show Admin Login" at the bottom of the login modal
3. Enter admin username and password
4. Click "Login as Admin"
5. You'll be redirected to the Reports page

## Admin Features

- Access to `/reports` page
- View all submitted strategic planning goals
- Filter by agency and rank
- Export reports to CSV
- View aggregated statistics

