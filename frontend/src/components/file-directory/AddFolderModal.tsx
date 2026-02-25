"use client";

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormField from '@/components/forms/FormField';
import { useToast } from '@/components/ToastProvider';
import { 
  saveCustomFolder, 
  isValidDriveLink,
  DEPARTMENTS,
  PRESET_FOLDER_COLORS,
} from '@/lib/file-directory';
import type { FileDirectory, Department } from '@/lib/file-directory-types';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (folder: FileDirectory) => void;
}

export default function AddFolderModal({ 
  isOpen, 
  onClose, 
  onSuccess
}: AddFolderModalProps) {
  const toast = useToast();
  
  const [driveLink, setDriveLink] = useState('');
  const [folderName, setFolderName] = useState('');
  const [department, setDepartment] = useState<Department>('Website Developers');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!driveLink.trim()) {
        toast.error('Please enter a Drive link');
        return;
      }

      if (!isValidDriveLink(driveLink)) {
        toast.error('Invalid Google Drive link format. Please use a valid Google Drive folder URL.');
        return;
      }

      if (!folderName.trim()) {
        toast.error('Please enter a folder name');
        return;
      }

      // Create folder
      const newFolder = saveCustomFolder({
        name: folderName.trim(),
        type: 'folder',
        department,
        driveLink: driveLink.trim(),
        parentId: null, // Backend will handle folder hierarchy
        customColor: customColor || undefined,
      });

      toast.success('Folder added successfully!');
      onSuccess(newFolder);
      handleClose();
    } catch (error) {
      console.error('Failed to add folder:', error);
      toast.error('Failed to add folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDriveLink('');
    setFolderName('');
    setDepartment('Website Developers');
    setCustomColor(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Drive Folder">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          id="driveLink"
          label="Google Drive Link"
          value={driveLink}
          onChange={(value) => setDriveLink(value)}
          placeholder="https://drive.google.com/drive/folders/..."
          required
          helperText="Paste the full Google Drive folder URL"
        />

        <FormField
          id="folderName"
          label="Folder Name"
          value={folderName}
          onChange={(value) => setFolderName(value)}
          placeholder="e.g., Marketing Assets 2026"
          required
          helperText="Enter a descriptive name for this folder"
        />

        <div className="w-full">
          <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            required
            aria-label="Department"
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Folder Color Picker */}
        <div className="w-full">
          <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
            Folder Color (Optional)
          </label>
          <select
            value={customColor || ''}
            onChange={(e) => setCustomColor(e.target.value || null)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            aria-label="Folder color"
          >
            <option value="">● Default (Department Color)</option>
            {PRESET_FOLDER_COLORS.map((color) => (
              <option key={color.value} value={color.value}>
                ● {color.name}
              </option>
            ))}
          </select>
          {customColor && (
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)]">
              <div 
                className="w-4 h-4 rounded border border-[var(--border)]" 
                style={{ backgroundColor: customColor }}
              />
              <span>Preview: Custom color will override department default</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Add Folder
          </Button>
        </div>
      </form>

      {/* Backend Integration Note */}
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
        <p className="font-medium mb-1">📝 Backend Partner Note:</p>
        <p className="text-xs opacity-90">
          Currently saves to localStorage. When backend is ready, replace saveCustomFolder() with 
          POST /api/file-directory/import to auto-fetch folder name from Drive API and persist to database.
        </p>
      </div>
    </Modal>
  );
}
