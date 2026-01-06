/**
 * Utility functions for persisting form data to localStorage
 * Uses user-specific keys to store data per user
 */

/**
 * Save data to localStorage with user-specific key
 */
export function saveUserData(userId: string, key: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = `${key}_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Load data from localStorage with user-specific key
 */
export function loadUserData<T>(userId: string, key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const storageKey = `${key}_${userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved) as T;
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  
  return null;
}

/**
 * Clear user-specific data from localStorage
 */
export function clearUserData(userId: string, key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = `${key}_${userId}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

/**
 * Debounce function to limit how often a function is called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}


