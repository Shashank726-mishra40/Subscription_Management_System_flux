// Brightloop Software - Authentication & RBAC Type Definitions

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  department?: string;
  phone?: string;
  companyName?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  lastLoginAt?: string;
  permissions?: string[];
  customerId?: string; // Links to customer records for CUSTOMER role
}

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: number; // Unix timestamp in ms
  used: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
  rememberMe: boolean;
}

export interface CustomerSubscriptionRequest {
  id: string;
  customerId: string;
  customerName: string;
  companyName: string;
  requestType: 'Add Seats' | 'Upgrade Plan' | 'Add-on License' | 'Cancellation Request';
  planName: string;
  requestedChanges: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}
