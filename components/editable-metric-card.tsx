'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditMode } from '@/hooks/use-edit-mode';

interface EditableMetricCardProps {
  title: string;
  value: number;
  icon: string;
  iconColor: string;
  format?: 'currency' | 'number' | 'percent';
  onSave: (value: number) => Promise<void>;
  isOverridden?: boolean;
  className?: string;
}

export function EditableMetricCard({
  title,
  value,
  icon,
  iconColor,
  format = 'number',
  onSave,
  isOverridden = false,
  className,
}: EditableMetricCardProps) {
  const isEditMode = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [saving, setSaving] = useState(false);

  const formatValue = (val: number): string => {
    if (format === 'currency') {
      // Format currency in millions/thousands
      if (val >= 1000000) {
        // Show in millions (M) with 2 decimal places
        const millions = val / 1000000;
        return `₱${millions.toFixed(2)}M`;
      } else if (val >= 1000) {
        // Show in thousands (K) with no decimals
        const thousands = val / 1000;
        return `₱${thousands.toFixed(0)}K`;
      } else {
        // Show as-is for values less than 1000
        return `₱${val.toFixed(0)}`;
      }
    }
    if (format === 'percent') {
      return `${val}%`;
    }
    // For numbers (cases, manpower, etc.), show as whole numbers
    return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const parseValue = (str: string): number => {
    // Remove currency symbols, commas, and percentage signs
    let cleaned = str.replace(/[₱,%]/g, '').trim();
    
    // Handle M (millions) and K (thousands) suffixes
    const upperCleaned = cleaned.toUpperCase();
    if (upperCleaned.endsWith('M')) {
      const numValue = parseFloat(upperCleaned.replace('M', '')) || 0;
      return numValue * 1000000;
    } else if (upperCleaned.endsWith('K')) {
      const numValue = parseFloat(upperCleaned.replace('K', '')) || 0;
      return numValue * 1000;
    }
    
    return parseFloat(cleaned) || 0;
  };

  const handleSave = async () => {
    const numValue = parseValue(editValue);
    setSaving(true);
    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving value:', error);
      alert('Failed to save value');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  return (
    <Card className={cn('relative', className, isOverridden && 'ring-2 ring-blue-500')}>
      {isOverridden && (
        <div className="absolute top-2 right-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Overridden
          </span>
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', iconColor)}>
            <i className={cn('fa-solid', icon, 'text-lg')}></i>
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="text-2xl font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl font-extrabold text-gray-800">{formatValue(value)}</p>
            {isEditMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                <i className="fa-solid fa-edit mr-1"></i>Edit
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

