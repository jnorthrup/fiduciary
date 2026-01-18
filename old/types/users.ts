/**
 * User Domain Types
 * Authentication and user management types
 */

export type UserRole = 'Owner' | 'Beneficial Owner' | 'Admin' | 'Editor' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  lastActive: string;
  _version: string;
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
  isPrivate?: boolean;
}
