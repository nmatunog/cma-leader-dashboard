# Production Deployment - Environment Variables

## Required Environment Variables for Vercel/Production

After pushing to GitHub, you need to add these environment variables in your Vercel project settings.

### Firebase Client SDK (Already Set)
These should already be configured:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

### NEW: Firebase Admin SDK (Required for Temp Password Feature)

Add these in Vercel → Settings → Environment Variables:

**Option 1: Individual Variables (Recommended)**
```
FIREBASE_PROJECT_ID=cma-dashboard-01-5a57b
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cma-dashboard-01-5a57b.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDANW1HL1PZ6/wz\nP9xrgKkinzcTIbEhpcBgCW3YcyF8wYkGBRDqyS6Ar2der/yb/kdiO+YfXymRIZR5\n31Yv/l+is1Roc8oNYgXbKxSkhAkfR7YgDYjxM8m1m81DYzYHuhwLYGZQ0KcGLU3W\nDrgT4lA0yA2bYhtYatd4YszldMxzfmGneqSUMhwE3tNWQEh/NY9Pim1TNXfMOX20\nKiwePTH13PZhE77XJFoTM71xPgcq1bhwhcG1+yFGFL43OOHZJajFl3R9yBYg88HG\nr6i1ym/TQhl61f62rvlWNIxcjwcm5iDAsR5YPvXphjAoSp3H9UV8lqSyTslMXuLn\ny/Wgktq5AgMBAAECggEAFFizgDEU3cE62cv9T833WYhkIpzS7N5obmIhJCQP2+56\nzE3V/Bye1RV8Skwz3+l7cf0oP5Lpygi1eG85Zuw1AHqeSU5UibUiLJCzZzTo6ExF\njcARCoNya0yaXnNOoWPEmzmxqwVjYOaD0lCNkOFIn0W8FwI8JdBtjbtbuEB0chc0\nSSKI0i9qYxmYITcGGG0uNypLKnl1x8xrpAp5vKT0e8yjpp1EqJIUlLZU057nhTaO\nV9e1fHZX5+alALsj0JnTscVLkB8AnIWQPnc8DG/QWySVQpPinBEsvURtr3pD4miE\nmtliNeeUZgwgCPu3DfazvtPDU6mIERxu/uCoIIPeDwKBgQDoI0jc2odDzlcefUtS\nhkmbCiPM/5o6qIRp+vJM0y92h6j16hS2VBstqpd8WdCTz+IoQoVZI81RqMon0LPY\nyIyOFsfMpCPdvIhhO9MMF2ldJmcqZ0lrHr6mu9lZi8CTvobI8yu9rkDf7Dx/eo1O\n6lEtbDFw1CJ1Ow45za6RC8aGvwKBgQDT92fcLb+1mXGTbBysVqPKCzB6/c6h40oV\nypgi7ZhTxDbv8TvDFrkOV5C9YCHamYOaki+Ez/UUqlo39QtMMnfFlfVyxXRLvvMI\nkdGBDCCm0MMUvwprjsuYT5a9ZoPly0n1WypgtXCF2YxnaG4sNZD9dRj6ZcCWdy4U\nme8VBD00hwKBgFQuZ3/fp2nJbAJcgXIdzJdyp+TxVCatccdU/4UomG+tZnI3PueX\nvHtk/6ZSk7bmjib3aJAY0Z4pTZX+sxmMMJxeWno1k+QXOIW6QiCCZO0ovgS8i/1S\nmuSv/nPgoCdz0kERHe2dQV1yt8Wq1Y+mnWWRdKRr6UsF7XS8x+9Fi+rVAoGAHiP1\nAcsDkqgSDVt3LE5ZlfZHW4XRpxVxyG15eqX8XhTtlurfi5skj1SGQVd1GOdxXj5h\nQWpsuBaNI53VkG0wuMjdEQfgxJCPcG2Ds+zsi6vtwXp02dyBONRAZAg6wydICfp/\nqSbDrFTF8UJZQDIRvuiyt5BWdU7XH5jP9VYX+esCgYASCKAKTUUS7vUgePfRjvLu\ntEX3MfGn8Oti1pbcx8ze53QqxAGHjeh4Ck3JrbKx/771E539I5w1ClZAzxRbQnmq\nFilEAQV3My2dtFK5pdFa8RApshHd7AR7OYXALHMhTkFs4HXpdXqGyUw+APx2JQ8a\n0tgttFdcJQmBh2gY6hWeMA==\n-----END PRIVATE KEY-----\n"
```

**Option 2: Service Account JSON (Alternative)**
```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"cma-dashboard-01-5a57b",...}'
```

### Password Encryption Key (Required)
```
PASSWORD_ENCRYPTION_KEY=086284f3ea8b651e55b7e2cacc4da423b211e36a706a232caaca067438e3eb0d
```

Generate a new one (optional, for better security):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Emergency Reset Password (Optional)
```
ADMIN_EMERGENCY_RESET_PASSWORD=CMA2026-Reset-Emergency!
```

Default is `CMA2026-Reset-Emergency!` if not set. Change to a secure password of your choice.

## Steps to Add in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. For each variable:
   - Click **Add New**
   - Enter the variable name (e.g., `FIREBASE_PROJECT_ID`)
   - Enter the value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**
4. After adding all variables, go to **Deployments** tab
5. Click the three dots (⋯) on the latest deployment → **Redeploy**

## Important Notes

⚠️ **Security:**
- Never commit these values to Git
- Use different service accounts for dev/staging/production
- Rotate keys regularly
- The service account should have minimal permissions (Authentication Admin + Firestore access)

⚠️ **For FIREBASE_PRIVATE_KEY:**
- Include the `\n` characters (newlines) as shown
- Or paste the key with actual newlines
- Make sure the quotes are included if using the JSON format

## Verification

After deployment, test the temp password feature:
1. Log in as admin
2. Go to User Management
3. Click "Set Temp" on a user
4. Verify the password is generated and displayed

