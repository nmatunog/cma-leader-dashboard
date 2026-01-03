# Firebase Admin SDK Setup

To enable temporary password generation, you need to set up Firebase Admin SDK.

## Option 1: Service Account Key (Recommended for Development)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Open the JSON file and copy its contents

### For Local Development

Add to `.env.local`:

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Note:** Replace the entire JSON object with your actual service account key. Make sure to keep the quotes.

### For Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `FIREBASE_SERVICE_ACCOUNT_KEY` with the JSON content (keep quotes)
4. Redeploy your application

## Option 2: Individual Environment Variables

Alternatively, you can set individual variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Note:** For `FIREBASE_PRIVATE_KEY`, include the `\n` characters or use actual newlines.

## Option 3: Application Default Credentials (Production/GCP)

If running on Google Cloud Platform (Cloud Run, App Engine, etc.), you can use Application Default Credentials. No additional setup needed - the SDK will automatically use the service account attached to the runtime.

## Password Encryption Key

Add a secure encryption key for storing passwords:

```env
PASSWORD_ENCRYPTION_KEY=your-secure-random-key-at-least-32-characters-long
```

Generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Notes

⚠️ **Important:**
- Never commit service account keys to Git
- Keep `.env.local` in `.gitignore`
- Use different service accounts for development and production
- Rotate keys regularly
- The service account should have minimal required permissions (typically just Authentication Admin and Firestore access)

## Emergency Reset Password (Optional)

For a hardcoded emergency password that works every time as a last resort:

```env
ADMIN_EMERGENCY_RESET_PASSWORD=CMA2026-Reset-Emergency!
```

**Note:** If not set, the default emergency password is `CMA2026-Reset-Emergency!`. Change this to a secure password of your choice.

⚠️ **Security:** This password can reset ANY user's password. Keep it secure and only share with trusted administrators.

## Testing

After setup, test the temporary password feature:

1. Log in as admin
2. Go to User Management
3. Click "Set Temp" on a user
4. The password should be generated and displayed
5. Copy the password and test logging in with it

To test the emergency reset:

1. Log in as admin
2. Go to User Management
3. Click "Emergency" button on a user
4. The hardcoded emergency password will be set and displayed
5. User can log in with this password and will be prompted to change it


