"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FolderCard from '@/components/file-directory/FolderCard';
import { FileDirectorySkeleton } from '@/components/ui/FeatureSkeletons';

// Lazy-loaded modal (only rendered when opened)
const AddFolderModal = dynamic(() => import('@/components/file-directory/AddFolderModal'), { ssr: false });
import { useToast } from '@/components/ToastProvider';
import { useUser } from '@/contexts/UserContext';
import { apiFetch } from '@/lib/api';
import {
  Folder,
  Plus,
  Search,
  Grid,
  List,
  ChevronRight,
  Home,
  Upload,
} from 'lucide-react';
import {
  filterFolders,
  sortFolders,
  getViewPreference,
  saveViewPreference,
  DEPARTMENTS,
} from '@/lib/file-directory';
import type { FileDirectory } from '@/lib/file-directory-types';
import { hasFullAccess } from '@/lib/role-access';

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiFolders(): Promise<FileDirectory[]> {
  const res = await apiFetch('/file-directory');
  if (!res.ok) throw new Error('Failed to fetch folders');
  return res.json();
}

async function apiChildren(parentId: string): Promise<FileDirectory[]> {
  const res = await apiFetch(`/file-directory/${parentId}/children`);
  if (!res.ok) throw new Error('Failed to fetch children');
  return res.json();
}

async function apiDeleteFolder(id: string): Promise<void> {
  const res = await apiFetch(`/file-directory/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete folder');
}

// ── Build breadcrumbs from folder list ──────────────────────────────────────

function buildBreadcrumbs(allFolders: FileDirectory[], folderId: string | null): FileDirectory[] {
  if (!folderId) return [];
  const path: FileDirectory[] = [];
  let current = allFolders.find(f => f.id === folderId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? allFolders.find(f => f.id === current!.parentId) : undefined;
  }
  return path;
}

// ── Page component ───────────────────────────────────────────────────────────

export default function FileDirectoryPage() {
  const toast = useToast();
  const { user } = useUser();
  const userHasFullAccess = hasFullAccess(user);
  const userDepartment = user?.department;

  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FileDirectory[]>([]);
  const [allLoadedFolders, setAllLoadedFolders] = useState<FileDirectory[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getViewPreference());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All Departments');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'date'>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derived: visible folders after filters
  const [folders, setFolders] = useState<FileDirectory[]>([]);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension on client side
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.doc', '.docx'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      toast.error('Supported formats: PNG, JPG, GIF, PDF, TXT, DOC, DOCX');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target?.result as string;

        // 1. Upload file
        const uploadRes = await apiFetch('/uploads', {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: base64Data,
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Upload failed');
        }

        const uploadResult = await uploadRes.json() as { id: string };

        // 2. Add as a file item
        const dept = departmentFilter === 'All Departments' ? 'All Departments' : departmentFilter;
        const registerRes = await apiFetch('/file-directory', {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            type: 'file',
            department: dept,
            parentId: currentFolderId || null,
            uploadId: uploadResult.id,
          }),
        });

        if (!registerRes.ok) {
          throw new Error('Failed to register file in directory');
        }

        toast.success(`"${file.name}" uploaded successfully`);
        loadFolders();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to upload file');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  // Set department filter based on role once user loads
  useEffect(() => {
    if (!userHasFullAccess && !userDepartment) return;
    if (userHasFullAccess) {
      setDepartmentFilter('All Departments'); // admins see everything
    } else if (userDepartment) {
      setDepartmentFilter(userDepartment);
    }
  }, [userHasFullAccess, userDepartment]);

  // Debounce the search so API only re-runs after 300ms idle
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load folders from backend
  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const data = currentFolderId
        ? await apiChildren(currentFolderId)
        : await apiFolders();

      setAllLoadedFolders(prev => {
        // Merge for breadcrumb building
        const map = new Map(prev.map(f => [f.id, f]));
        data.forEach(f => map.set(f.id, f));
        return Array.from(map.values());
      });

      const filtered = filterFolders(data, debouncedSearchQuery, departmentFilter);
      const sorted = sortFolders(filtered, sortBy);
      setFolders(sorted);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, debouncedSearchQuery, departmentFilter, sortBy, toast]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    setBreadcrumbs(buildBreadcrumbs(allLoadedFolders, currentFolderId));
  }, [allLoadedFolders, currentFolderId]);

  // Handle view mode change
  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveViewPreference(mode);
  };

  // Navigate into folder
  const handleFolderClick = (folder: FileDirectory) => {
    if (folder.type === 'file') {
      toast.info('File record selected', 'Direct file links are disabled for this workspace.');
    } else {
      setCurrentFolderId(folder.id);
    }
  };

  // Navigate via breadcrumbs
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Handle folder deletion
  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to remove this folder from the directory?')) return;
    try {
      await apiDeleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      toast.success('Folder removed');
    } catch {
      toast.error('Failed to remove folder');
    }
  };

  // Handle successful folder addition
  const handleFolderAdded = (newFolder: FileDirectory) => {
    loadFolders(); // refresh from server
    toast.success(`"${newFolder.name}" added to directory`);
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="p-6">
        <Header
          title="Company File Directory"
          subtitle="Organized structure of all company folders and resources"
        />

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 py-4 text-sm flex-wrap">
          <button
            onClick={() => handleBreadcrumbClick(null)}
            className="flex min-h-10 items-center gap-1 rounded-[var(--radius-md)] px-2 text-[var(--muted)] transition-colors hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Home className="w-4 h-4" />
            Home
          </button>

          {breadcrumbs.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
              <button
                onClick={() => handleBreadcrumbClick(folder.id)}
                className={`min-h-10 rounded-[var(--radius-md)] px-2 transition-colors hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${index === breadcrumbs.length - 1
                  ? 'text-[var(--foreground)] font-medium'
                  : 'text-[var(--muted)]'
                  }`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}

        </div>

        {/* Toolbar — hide when in Drive mode */}
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card-surface)] py-2 pl-10 pr-4 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--card-surface)] px-4 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
              aria-label="Filter by department"
            >
              <option value="All Departments">Global Directory</option>
              {DEPARTMENTS.filter(d => d !== 'All Departments').map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--card-surface)] px-4 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
              aria-label="Sort folders"
            >
              <option value="name">Sort by Name</option>
              <option value="department">Sort by Department</option>
              <option value="date">Sort by Date</option>
            </select>

            <div className="flex-1" />

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                size="sm"
                icon={<Grid className="w-4 h-4" />}
                onClick={() => handleViewChange('grid')}
                aria-label="Grid view"
              />
              <Button
                variant={viewMode === 'list' ? 'primary' : 'secondary'}
                size="sm"
                icon={<List className="w-4 h-4" />}
                onClick={() => handleViewChange('list')}
                aria-label="List view"
              />
            </div>

            {/* Upload File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.doc,.docx"
              className="hidden"
            />
            <Button
              variant="secondary"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
            >
              Upload File
            </Button>

            {/* Add Folder */}
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Folder
            </Button>
        </div>

        {loading ? (
          <FileDirectorySkeleton viewMode={viewMode} />
        ) : folders.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <Folder className="w-16 h-16 mx-auto text-[var(--muted)] mb-4 opacity-50" />
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              No folders found
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              {searchQuery || (departmentFilter && departmentFilter !== 'All Departments')
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first folder or file'}
            </p>
            {!searchQuery && (!departmentFilter || departmentFilter === 'All Departments') && (
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  Upload a File
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowAddModal(true)}
                >
                  Add Your First Folder
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.map((folder, index) => (
              <div
                key={folder.id}
                className="folder-card"
                style={{ '--animation-delay': `${index * 50}ms` } as React.CSSProperties}
              >
                <FolderCard
                  folder={folder}
                  onClick={() => handleFolderClick(folder)}
                  onDelete={() => handleDeleteFolder(folder.id)}
                  viewMode="grid"
                />
              </div>
            ))}
          </div>
        ) : (
          <Card padding="none">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={() => handleFolderClick(folder)}
                onDelete={() => handleDeleteFolder(folder.id)}
                viewMode="list"
              />
            ))}
          </Card>
        )}
      </div>

      {/* Add Folder Modal */}
      <AddFolderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleFolderAdded}
        parentId={currentFolderId}
      />

      {/* CSS Animations */}
      <style jsx global>{`
        .folder-card {
          animation: slideUpFade 0.3s ease-out both;
          animation-delay: var(--animation-delay, 0ms);
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
