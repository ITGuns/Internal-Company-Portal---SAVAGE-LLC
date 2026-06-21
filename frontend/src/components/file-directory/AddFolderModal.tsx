"use client";

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormField from '@/components/forms/FormField';
import { useToast } from '@/components/ToastProvider';
import {
  DEPARTMENTS,
  PRESET_FOLDER_COLORS,
} from '@/lib/file-directory';
import { apiFetch } from '@/lib/api';
import type { FileDirectory, Department } from '@/lib/file-directory-types';
import { FolderOpen } from 'lucide-react';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (folder: FileDirectory) => void;
  parentId?: string | null;
}

export default function AddFolderModal({
  isOpen,
  onClose,
  onSuccess,
  parentId = null,
}: AddFolderModalProps) {
  const toast = useToast();

  const [folderName, setFolderName] = useState('');
  const [department, setDepartment] = useState<Department>('All Departments');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!folderName.trim()) {
        toast.error('Please enter a folder name');
        return;
      }

      const createRes = await apiFetch('/file-directory', {
        method: 'POST',
        body: JSON.stringify({
          name: folderName.trim(),
          type: 'folder',
          department,
          parentId: parentId || null,
          customColor: customColor || undefined,
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to save folder');
      }

      const newFolder: FileDirectory = await createRes.json();

      toast.success(`"${newFolder.name}" added!`);
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
    setFolderName('');
    setDepartment('All Departments');
    setCustomColor(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Folder" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="folderName"
          label="Folder Name"
          value={folderName}
          onChange={(value) => setFolderName(value)}
          placeholder="e.g., Marketing Assets 2026"
          required={true}
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
            Folder Color <span className="text-red-500">*</span>
          </label>
          <select
            value={customColor || ''}
            onChange={(e) => setCustomColor(e.target.value || null)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
            aria-label="Folder color"
            required
          >
            <option value="">Select Folder Color</option>
            {PRESET_FOLDER_COLORS.map((color) => (
              <option key={color.value} value={color.value}>
                {color.name}
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
            icon={<FolderOpen className="w-4 h-4" />}
          >
            Add Folder
          </Button>
        </div>
      </form>
    </Modal>
  );
}
