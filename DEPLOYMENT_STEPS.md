# Quick Deployment Steps

## ✅ Step 1: Push to GitHub (COMPLETED)

The code has been committed. Now push to GitHub:

```bash
git push origin main
```

If you get SSL certificate errors, you can push manually through GitHub Desktop or your IDE's git interface.

## 📋 Step 2: Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`cma-leader-dashboard`)
3. Go to **Settings** → **Environment Variables**
4. Add the following NEW variables:

### Firebase Admin SDK Variables

**FIREBASE_PROJECT_ID**
```
cma-dashboard-01-5a57b
```

**FIREBASE_CLIENT_EMAIL**
```
firebase-adminsdk-fbsvc@cma-dashboard-01-5a57b.iam.gserviceaccount.com
```

**FIREBASE_PRIVATE_KEY**
```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDANW1HL1PZ6/wz
P9xrgKkinzcTIbEhpcBgCW3YcyF8wYkGBRDqyS6Ar2der/yb/kdiO+YfXymRIZR5
31Yv/l+is1Roc8oNYgXbKxSkhAkfR7YgDYjxM8m1m81DYzYHuhwLYGZQ0KcGLU3W
DrgT4lA0yA2bYhtYatd4YszldMxzfmGneqSUMhwE3tNWQEh/NY9Pim1TNXfMOX20
KiwePTH13PZhE77XJFoTM71xPgcq1bhwhcG1+yFGFL43OOHZJajFl3R9yBYg88HG
r6i1ym/TQhl61f62rvlWNIxcjwcm5iDAsR5YPvXphjAoSp3H9UV8lqSyTslMXuLn
y/Wgktq5AgMBAAECggEAFFizgDEU3cE62cv9T833WYhkIpzS7N5obmIhJCQP2+56
zE3V/Bye1RV8Skwz3+l7cf0oP5Lpygi1eG85Zuw1AHqeSU5UibUiLJCzZzTo6ExF
jcARCoNya0yaXnNOoWPEmzmxqwVjYOaD0lCNkOFIn0W8FwI8JdBtjbtbuEB0chc0
SSKI0i9qYxmYITcGGG0uNypLKnl1x8xrpAp5vKT0e8yjpp1EqJIUlLZU057nhTaO
V9e1fHZX5+alALsj0JnTscVLkB8AnIWQPnc8DG/QWySVQpPinBEsvURtr3pD4miE
mtliNeeUZgwgCPu3DfazvtPDU6mIERxu/uCoIIPeDwKBgQDoI0jc2odDzlcefUtS
hkmbCiPM/5o6qIRp+vJM0y92h6j16hS2VBstqpd8WdCTz+IoQoVZI81RqMon0LPY
yIyOFsfMpCPdvIhhO9MMF2ldJmcqZ0lrHr6mu9lZi8CTvobI8yu9rkDf7Dx/eo1O
6lEtbDFw1CJ1Ow45za6RC8aGvwKBgQDT92fcLb+1mXGTbBysVqPKCzB6/c6h40oV
ypgi7ZhTxDbv8TvDFrkOV5C9YCHamYOaki+Ez/UUqlo39QtMMnfFlfVyxXRLvvMI
kdGBDCCm0MMUvwprjsuYT5a9ZoPly0n1WypgtXCF2YxnaG4sNZD9dRj6ZcCWdy4U
me8VBD00hwKBgFQuZ3/fp2nJbAJcgXIdzJdyp+TxVCatccdU/4UomG+tZnI3PueX
vHtk/6ZSk7bmjib3aJAY0Z4pTZX+sxmMMJxeWno1k+QXOIW6QiCCZO0ovgS8i/1S
muSv/nPgoCdz0kERHe2dQV1yt8Wq1Y+mnWWRdKRr6UsF7XS8x+9Fi+rVAoGAHiP1
AcsDkqgSDVt3LE5ZlfZHW4XRpxVxyG15eqX8XhTtlurfi5skj1SGQVd1GOdxXj5h
QWpsuBaNI53VkG0wuMjdEQfgxJCPcG2Ds+zsi6vtwXp02dyBONRAZAg6wydICfp/
qSbDrFTF8UJZQDIRvuiyt5BWdU7XH5jP9VYX+esCgYASCKAKTUUS7vUgePfRjvLu
tEX3MfGn8Oti1pbcx8ze53QqxAGHjeh4Ck3JrbKx/771E539I5w1ClZAzxRbQnmq
FilEAQV3My2dtFK5pdFa8RApshHd7AR7OYXALHMhTkFs4HXpdXqGyUw+APx2JQ8a
0tgttFdcJQmBh2gY6hWeMA==
-----END PRIVATE KEY-----
```

**PASSWORD_ENCRYPTION_KEY**
```
086284f3ea8b651e55b7e2cacc4da423b211e36a706a232caaca067438e3eb0d
```

**ADMIN_EMERGENCY_RESET_PASSWORD** (Optional)
```
CMA2026-Reset-Emergency!
```

### Important Notes:

- For **FIREBASE_PRIVATE_KEY**: Paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Select **Production**, **Preview**, and **Development** for all variables
- Click **Save** after adding each variable

## 🚀 Step 3: Deploy to Production

After adding all environment variables:

1. Go to **Deployments** tab in Vercel
2. Find your latest deployment (or the one with the commit you just pushed)
3. Click the three dots (⋯) → **Redeploy**
4. Or Vercel will automatically deploy when you push to GitHub

## ✅ Step 4: Verify Deployment

1. Wait for deployment to complete (usually 2-3 minutes)
2. Visit your production URL
3. Log in as admin
4. Go to User Management
5. Test the "Set Temp" button on a user
6. Verify the password is generated and displayed

## 🔧 Troubleshooting

If temp password feature doesn't work:
- Check Vercel deployment logs for errors
- Verify all environment variables are set correctly
- Make sure the private key includes newlines (or use `\n`)
- Check browser console for any errors

