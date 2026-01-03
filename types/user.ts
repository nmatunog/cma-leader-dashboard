/**
 * User types and interfaces for authentication and authorization
 */

import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'leader' | 'advisor';
export type UserRank = 'ADMIN' | 'ADD' | 'SUM' | 'UM' | 'AUM' | 'ADV';

export interface User {
  uid: string;                    // Firebase Auth UID (document ID)
  email: string;                  // Email (may be generated from code like {code}@cma.local)
  code?: string;                  // Advisor/Leader code (primary identifier)
  name: string;
  role: UserRole;
  rank: UserRank;
  unitManager?: string;           // For advisors/leaders
  agencyName: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  lastLoginAt?: Timestamp | Date;
  isActive: boolean;
  createdBy?: string;             // UID of admin who created this user
  emailVerified?: boolean;
  isTempPassword?: boolean;       // If true, user must change password on next login
}

export interface UserCreateData {
  email: string;                  // Email (may be generated from code)
  code?: string;                  // Advisor/Leader code (optional, used for code-based signup)
  password: string;
  name: string;
  role: UserRole;
  rank: UserRank;
  unitManager?: string;
  agencyName: string;
}

export interface UserUpdateData {
  name?: string;
  role?: UserRole;
  rank?: UserRank;
  unitManager?: string;
  agencyName?: string;
  isActive?: boolean;
  isTempPassword?: boolean;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface UserWithAuth extends User {
  authUser: AuthUser;
}

// Permission checks
export interface UserPermissions {
  canManageUsers: boolean;
  canViewReports: boolean;
  canAccessLeaderTabs: boolean;
  canToggleLeaderView: boolean;
  canEditAllGoals: boolean;
  canViewAllAgencies: boolean;
}


