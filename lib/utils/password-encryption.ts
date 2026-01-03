/**
 * Password Encryption/Decryption Utilities
 * Uses AES-256-GCM for secure password storage
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption key (should be stored in environment variable)
const getEncryptionKey = (): string => {
  const key = process.env.PASSWORD_ENCRYPTION_KEY;
  if (!key) {
    // Fallback to a default key (not secure for production)
    console.warn('PASSWORD_ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)');
    return 'default-encryption-key-change-in-production-32chars!!';
  }
  return key;
};

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive encryption key from password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt a password for storage
 */
export async function encryptPassword(plaintext: string): Promise<string> {
  try {
    const password = getEncryptionKey();
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(password, salt);
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine: salt + iv + authTag + encrypted
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Error encrypting password:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a stored password
 */
export async function decryptPassword(encryptedText: string): Promise<string> {
  try {
    const password = getEncryptionKey();
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = await deriveKey(password, salt);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Error decrypting password:', error);
    throw new Error('Failed to decrypt password');
  }
}


