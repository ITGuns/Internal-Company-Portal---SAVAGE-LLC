"use client";

import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormField from '@/components/forms/FormField';
import { useToast } from '@/components/ToastProvider';
import {
  saveCustomFolder,
  isValidDriveLink,
  extractDriveFolderId,
  fetchDriveSubfolders,
  DEPARTMENTS,
  PRESET_FOLDER_COLORS,
} from '@/lib/file-directory';
import type { DriveSubfolder } from '@/lib/file-directory';
import type { FileDirectory, Department } from '@/lib/file-directory-types';
import { FolderSearch, Loader2, CheckCircle2, FolderOpen, AlertCircle, Info } from 'lucide-react';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (folder: FileDirectory) => void;
}

export default function AddFolderModal({
  isOpen,
  onClose,
  onSuccess,
}: AddFolderModalProps) {
  const toast = useToast();

  const [driveLink, setDriveLink] = useState('');
  const [folderName, setFolderName] = useState('');
  const [department, setDepartment] = useState<Department>('Website Developers');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Subfolder detection state
  const [detectingSubfolders, setDetectingSubfolders] = useState(false);
  const [detectedSubfolders, setDetectedSubfolders] = useState<DriveSubfolder[]>([]);
  const [selectedSubfolders, setSelectedSubfolders] = useState<Set<string>>(new Set());
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'loading' | 'done' | 'error' | 'no-key'>('idle');
  const detectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-detect subfolders when a valid Drive link is pasted
  useEffect(() => {
    if (detectTimeoutRef.current) clearTimeout(detectTimeoutRef.current);

    if (!isValidDriveLink(driveLink)) {
      setDetectedSubfolders([]);
      setSelectedSubfolders(new Set());
      setDetectionStatus('idle');
      return;
    }

    const folderId = extractDriveFolderId(driveLink);
    if (!folderId) return;

    // Small debounce so we don't fire on every keystroke
    detectTimeoutRef.current = setTimeout(async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        setDetectionStatus('no-key');
        return;
      }

      setDetectionStatus('loading');
      setDetectingSubfolders(true);
      setDetectedSubfolders([]);
      setSelectedSubfolders(new Set());

      try {
        const subs = await fetchDriveSubfolders(folderId);
        setDetectedSubfolders(subs);
        // Pre-select all detected subfolders
        setSelectedSubfolders(new Set(subs.map(s => s.id)));
        setDetectionStatus('done');
      } catch {
        setDetectionStatus('error');
      } finally {
        setDetectingSubfolders(false);
      }
    }, 600);

    return () => {
      if (detectTimeoutRef.current) clearTimeout(detectTimeoutRef.current);
    };
  }, [driveLink]);

  const toggleSubfolder = (id: string) => {
    setSelectedSubfolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSubfolders.size === detectedSubfolders.length) {
      setSelectedSubfolders(new Set());
    } else {
      setSelectedSubfolders(new Set(detectedSubfolders.map(s => s.id)));
    }
  };

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

      // Save parent folder
      const newFolder = saveCustomFolder({
        name: folderName.trim(),
        type: 'folder',
        department,
        driveLink: driveLink.trim(),
        parentId: null,
        customColor: customColor || undefined,
      });

      // Save selected subfolders as children of the parent
      const subFoldersToSave = detectedSubfolders.filter(s => selectedSubfolders.has(s.id));
      for (const sub of subFoldersToSave) {
        saveCustomFolder({
          name: sub.name,
          type: 'folder',
          department,
          driveLink: sub.driveLink,
          parentId: newFolder.id,
          customColor: customColor || undefined,
        });
      }

      const subMsg = subFoldersToSave.length > 0
        ? ` with ${subFoldersToSave.length} subfolder${subFoldersToSave.length > 1 ? 's' : ''}`
        : '';

      toast.success(`"${newFolder.name}" added${subMsg}!`);
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
    setDetectedSubfolders([]);
    setSelectedSubfolders(new Set());
    setDetectionStatus('idle');
    onClose();
  };

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Drive Folder" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="driveLink"
          label="Google Drive Link"
          value={driveLink}
          onChange={(value) => setDriveLink(value)}
          placeholder="https://drive.google.com/drive/folders/..."
          required
          helperText="Paste the full Google Drive folder URL"
        />

        {/* Subfolder Detection Status */}
        {isValidDriveLink(driveLink) && (
          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--card-surface)] border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderSearch className="w-4 h-4 text-blue-500" />
                <span>Auto-detected Subfolders</span>
                {detectionStatus === 'loading' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--muted)]" />
                )}
                {detectionStatus === 'done' && detectedSubfolders.length > 0 && (
                  <span className="text-xs text-[var(--muted)]">
                    ({detectedSubfolders.length} found)
                  </span>
                )}
              </div>
              {detectionStatus === 'done' && detectedSubfolders.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  {selectedSubfolders.size === detectedSubfolders.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-3">
              {detectionStatus === 'loading' && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning Drive folder for subfolders...
                </div>
              )}

              {detectionStatus === 'no-key' && (
                <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 py-1">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Add <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded text-xs">NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY</code> to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded text-xs">.env.local</code> to enable automatic subfolder detection.
                  </span>
                </div>
              )}

              {detectionStatus === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-500 py-1">
                  <AlertCircle className="w-4 h-4" />
                  Could not detect subfolders. Make sure the folder is set to "Anyone with the link" access.
                </div>
              )}

              {detectionStatus === 'done' && detectedSubfolders.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)] py-1">
                  <Info className="w-4 h-4" />
                  No subfolders detected in this Drive folder.
                </div>
              )}

              {detectionStatus === 'done' && detectedSubfolders.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto chat-scroll">
                  {detectedSubfolders.map(sub => (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedSubfolders.has(sub.id)
                          ? 'bg-blue-50 dark:bg-blue-950/30'
                          : 'hover:bg-[var(--card-surface)]'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubfolders.has(sub.id)}
                        onChange={() => toggleSubfolder(sub.id)}
                        className="w-4 h-4 rounded accent-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                      />
                      <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selectedSubfolders.has(sub.id) ? 'text-blue-500' : 'text-[var(--muted)]'}`} />
                      <span className="text-sm flex-1 truncate">{sub.name}</span>
                      {selectedSubfolders.has(sub.id) && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Summary banner */}
        {detectionStatus === 'done' && selectedSubfolders.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-sm text-blue-700 dark:text-blue-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Will import <strong>1 parent folder</strong> + <strong>{selectedSubfolders.size} subfolder{selectedSubfolders.size > 1 ? 's' : ''}</strong>
          </div>
        )}

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
            icon={<FolderSearch className="w-4 h-4" />}
          >
            {detectionStatus === 'done' && selectedSubfolders.size > 0
              ? `Add Folder + ${selectedSubfolders.size} Subfolder${selectedSubfolders.size > 1 ? 's' : ''}`
              : 'Add Folder'
            }
          </Button>
        </div>
      </form>

      {/* Setup note */}
      {!hasApiKey && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
          <p className="font-medium mb-1">🔑 Enable Auto-Detect Subfolders</p>
          <p className="text-xs opacity-90">
            Add a Google Drive API key to your <code className="bg-amber-100 dark:bg-amber-800/40 px-1 rounded">.env.local</code>:
          </p>
          <code className="block mt-1 text-xs bg-amber-100 dark:bg-amber-800/40 px-2 py-1 rounded">
            NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=your_key_here
          </code>
          <p className="text-xs mt-1 opacity-75">
            Get a key at <strong>console.cloud.google.com</strong> → Enable Drive API → Create API Key
          </p>
        </div>
      )}
    </Modal>
  );
}
