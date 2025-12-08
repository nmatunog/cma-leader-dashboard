'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkEditMode, enableEditMode, disableEditMode } from '@/lib/edit-mode';

interface EditModeToggleProps {
  onModeChange?: (enabled: boolean) => void;
}

export function EditModeToggle({ onModeChange }: EditModeToggleProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const enabled = checkEditMode();
    setIsEditMode(enabled);
    onModeChange?.(enabled);
  }, [onModeChange]);

  const handleEnable = () => {
    if (enableEditMode(password)) {
      setIsEditMode(true);
      setShowPasswordDialog(false);
      setPassword('');
      setError('');
      onModeChange?.(true);
    } else {
      setError('Incorrect password');
    }
  };

  const handleDisable = () => {
    disableEditMode();
    setIsEditMode(false);
    onModeChange?.(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isEditMode ? (
        <>
          <span className="text-sm text-green-600 font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-check"></i>
            Edit Mode Active
          </span>
          <Button onClick={handleDisable} variant="outline" size="sm">
            <i className="fa-solid fa-lock mr-2"></i>Lock Editing
          </Button>
        </>
      ) : (
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <i className="fa-solid fa-unlock mr-2"></i>Enable Editing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable Edit Mode</DialogTitle>
              <DialogDescription>
                Enter password to enable editing of targets and forecasts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEnable();
                  }}
                  placeholder="Enter edit password"
                  autoFocus
                />
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </div>
              <Button onClick={handleEnable} className="w-full">
                Enable Editing
              </Button>
              <p className="text-xs text-gray-500">
                Edit mode will remain active for 24 hours or until you lock it.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

