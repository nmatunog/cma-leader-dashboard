# Where to Select the 3 Environments in Vercel - Quick Answer

## 📍 Quick Answer

When adding environment variables in Vercel:

1. **Go to:** Your Project → **Settings** → **Environment Variables**
2. **Click:** "Add New" button
3. **Fill in:** Key and Value
4. **Look for:** Three checkboxes labeled:
   - ☐ Production
   - ☐ Preview
   - ☐ Development
5. **Check all three boxes** ✅ ✅ ✅
6. **Click:** "Save"

---

## Visual Location

```
Vercel Dashboard
  └─ Your Project (cma-leader-dashboard)
      └─ Settings (top navigation)
          └─ Environment Variables (left sidebar)
              └─ [Add New] button
                  └─ Form appears with:
                      - Key: [input field]
                      - Value: [input field]
                      - Environment: ☐ Production  ← HERE!
                                      ☐ Preview     ← HERE!
                                      ☐ Development ← HERE!
                      - [Save] button
```

---

## Important

- The environment checkboxes appear **inside the form** when you click "Add New"
- You need to check all 3 for each variable
- They're usually already pre-selected (check to confirm)
- Select all 3 environments: Production, Preview, Development

---

## Still Can't Find It?

1. Make sure you're in **Settings** → **Environment Variables** (not Build Settings)
2. Click the **"Add New"** button first (the checkboxes appear in the popup/form)
3. The form should show the environment selection below the Value field

---

**That's it! The environment selection is in the form when you add a new variable.**


