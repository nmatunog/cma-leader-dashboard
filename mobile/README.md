# CMA Strategic Planning Mobile (Expo)

Separate mobile app project for the Strategic Planning experience, optimized for phones and tablets (iOS/Android). The existing web app remains unchanged.

## Stack
- Expo (managed workflow)
- React Native
- React Navigation (tabs)
- TypeScript

## Getting started
```bash
cd cma-dashboard/mobile
npm install
npm run start  # or: npm run android / npm run ios
```

## Environment variables (Firebase)
Add to `cma-dashboard/mobile/.env` or Expo Secrets (EAS):
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

## Current scaffold
- Bottom tabs for: Overview, Advisor Sim, Leader HQ, Path to Premier, Goals, Reports
- Placeholder screens (wire in logic from web app utilities next)

## Next steps (recommended)
1) Port shared logic:
   - `components/strategic-planning/utils/bonus-calculations.ts`
   - number formatting helpers
   - Firebase service (adapt to RN Firebase or Expo SDK)
2) Replace Chart.js with `react-native-chart-kit` or `victory-native`
3) PDF/exports: use `expo-print` + `expo-sharing`
4) Auth: reuse login logic; store session in `AsyncStorage`
5) Polish tablet layouts (use responsive styles / breakpoints)

