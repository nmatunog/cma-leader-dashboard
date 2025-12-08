'use client';

import { useState, useEffect } from 'react';
import { checkEditMode } from '@/lib/edit-mode';

export function useEditMode() {
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setIsEditMode(checkEditMode());

    // Listen for storage changes (when edit mode is enabled/disabled in another tab)
    const handleStorageChange = () => {
      setIsEditMode(checkEditMode());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return isEditMode;
}

