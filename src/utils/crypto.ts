// In-browser Web Crypto API utilities for password hashing & security

const PEPPER = 'brightloop_saas_sec_pepper_2026';

export function generateSalt(length: number = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}:${salt}:${PEPPER}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureToken(byteLength: number = 32): string {
  const array = new Uint8Array(byteLength);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean; // More than 8 characters (> 8)
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  errorMessage?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length > 8; // Strictly more than 8 characters as per requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasSpecialChar;

  let errorMessage = '';
  if (!hasMinLength) {
    errorMessage = 'Password must be more than 8 characters long.';
  } else if (!hasUppercase) {
    errorMessage = 'Password must include at least one uppercase letter.';
  } else if (!hasLowercase) {
    errorMessage = 'Password must include at least one lowercase letter.';
  } else if (!hasSpecialChar) {
    errorMessage = 'Password must include at least one special character.';
  }

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    errorMessage: isValid ? undefined : errorMessage,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
