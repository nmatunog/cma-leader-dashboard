'use client';

// Temporarily bypassing AuthProvider to test if it's causing the 500 error
// import { AuthProvider } from '@/contexts/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  // TEMPORARY: Bypassing AuthProvider to test if it's causing the 500 error
  // TODO: Re-enable AuthProvider after fixing the issue
  return <>{children}</>;
  // return <AuthProvider>{children}</AuthProvider>;
}


