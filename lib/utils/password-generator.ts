/**
 * Secure Password Generator
 * Generates cryptographically secure random passwords
 */

import { randomBytes } from 'crypto';

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 12)
 * @returns Secure random password
 */
export function generateSecurePassword(length: number = 12): string {
  // Character sets
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  // Combine all character sets
  const allChars = lowercase + uppercase + numbers + symbols;
  
  // Generate random bytes
  const randomBytesArray = randomBytes(length);
  
  // Convert to password
  let password = '';
  for (let i = 0; i < length; i++) {
    password += allChars[randomBytesArray[i] % allChars.length];
  }
  
  // Ensure password has at least one character from each set
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*]/.test(password);
  
  if (!hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
    // If missing any character type, regenerate
    return generateSecurePassword(length);
  }
  
  return password;
}

/**
 * Generate a readable temporary password (easier to communicate)
 * Format: Word-Word-Number (e.g., "Blue-Car-42")
 */
export function generateReadablePassword(): string {
  const adjectives = ['Blue', 'Red', 'Green', 'Fast', 'Strong', 'Bright', 'Clear', 'Quick', 'Smart', 'Cool'];
  const nouns = ['Car', 'Star', 'Moon', 'Bird', 'Fish', 'Tree', 'Cloud', 'Wind', 'Wave', 'Rock'];
  
  const randomBytesArray = randomBytes(3);
  const adjective = adjectives[randomBytesArray[0] % adjectives.length];
  const noun = nouns[randomBytesArray[1] % nouns.length];
  const number = (randomBytesArray[2] % 90) + 10; // 10-99
  
  return `${adjective}-${noun}-${number}`;
}


