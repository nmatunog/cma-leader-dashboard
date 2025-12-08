// Simple edit mode management with password protection
// No complex auth needed - just a password-protected edit mode

const EDIT_MODE_KEY = 'cma-edit-mode';
const EDIT_MODE_PASSWORD = process.env.NEXT_PUBLIC_EDIT_PASSWORD || 'cma2025'; // Default password

export function checkEditMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem(EDIT_MODE_KEY);
  if (!stored) return false;

  try {
    const { expires, password } = JSON.parse(stored);
    // Check if expired (24 hours)
    if (Date.now() > expires) {
      localStorage.removeItem(EDIT_MODE_KEY);
      return false;
    }
    // Verify password matches
    return password === EDIT_MODE_PASSWORD;
  } catch {
    return false;
  }
}

export function enableEditMode(password: string): boolean {
  if (password !== EDIT_MODE_PASSWORD) {
    return false;
  }

  if (typeof window === 'undefined') return false;

  // Store edit mode for 24 hours
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(
    EDIT_MODE_KEY,
    JSON.stringify({ expires, password })
  );
  return true;
}

export function disableEditMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EDIT_MODE_KEY);
}

