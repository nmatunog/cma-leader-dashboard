/**
 * Permission and authorization utilities
 * Centralized permission checks for roles
 */

import type { User, UserRole } from '@/types/user';

/**
 * Check if user is admin or superuser
 */
export function isAdminOrSuperuser(user: User | null): boolean {
  if (!user) return false;
  // Allow access if isActive is not explicitly false (handles undefined/missing fields)
  if (user.isActive === false) return false;
  return user.role === 'admin' || user.role === 'superuser';
}

/**
 * Check if user is superuser
 */
export function isSuperuser(user: User | null): boolean {
  if (!user) return false;
  // Allow access if isActive is not explicitly false (handles undefined/missing fields)
  if (user.isActive === false) return false;
  return user.role === 'superuser';
}

/**
 * Check if user is admin (but not superuser)
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  // Allow access if isActive is not explicitly false (handles undefined/missing fields)
  if (user.isActive === false) return false;
  return user.role === 'admin';
}

/**
 * Check if user can manage users (admin or superuser)
 */
export function canManageUsers(user: User | null): boolean {
  return isAdminOrSuperuser(user);
}

/**
 * Check if user is viewer (read-only access)
 */
export function isViewer(user: User | null): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  return user.role === 'viewer';
}

/**
 * Check if user can view reports (admin, superuser, or viewer)
 */
export function canViewReports(user: User | null): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  return user.role === 'admin' || user.role === 'superuser' || user.role === 'viewer';
}

/**
 * Check if user can access admin pages (admin or superuser only - viewers cannot manage)
 */
export function canAccessAdminPages(user: User | null): boolean {
  return isAdminOrSuperuser(user);
}

/**
 * Check if user can edit data (not viewers)
 */
export function canEditData(user: User | null): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  // Viewers cannot edit anything
  if (user.role === 'viewer') return false;
  return true;
}

