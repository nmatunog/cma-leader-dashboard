/**
 * Admin Configuration
 * Store admin credentials securely
 * 
 * For production, these should be set as environment variables:
 * NEXT_PUBLIC_ADMIN_USERNAME and NEXT_PUBLIC_ADMIN_PASSWORD
 * 
 * For development, default credentials are provided below.
 */

// Admin credentials
// In production, these should come from environment variables
export const ADMIN_CREDENTIALS = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin',
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '@Nbm0823',
};

/**
 * Verify admin credentials
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

/**
 * Check if user is admin (from localStorage)
 */
export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('sp_user_role') === 'admin';
}

