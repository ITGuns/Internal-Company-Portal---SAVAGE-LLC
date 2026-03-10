"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FolderCard from '@/components/file-directory/FolderCard';
import DriveFileViewer from '@/components/file-directory/DriveFileViewer';

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
  Loader2,
} from 'lucide-react';
import {
  filterFolders,
  sortFolders,
  getViewPreference,
  saveViewPreference,
  extractDriveFolderId,
  DEPARTMENTS,
} from '@/lib/file-directory';
import type { FileDirectory } from '@/lib/file-directory-types';

// Drive live mode state
interface DriveMode {
  folderId: string;
  folderName: string;
}

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

async function apiCreateFolder(data: {
  name: string;
  department: string;
  driveLink?: string;
  parentId?: string | null;
  customColor?: string;
}): Promise<FileDirectory> {
  const res = await apiFetch('/file-directory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create folder');
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

  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FileDirectory[]>([]);
  const [allLoadedFolders, setAllLoadedFolders] = useState<FileDirectory[]>([]);

  // Drive Live Mode — when browsing a real Drive folder inline
  const [driveMode, setDriveMode] = useState<DriveMode | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getViewPreference());
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All Departments');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'date'>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derived: visible folders after filters
  const [folders, setFolders] = useState<FileDirectory[]>([]);

  // Set department filter based on role once user loads
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      setDepartmentFilter('All Departments'); // admins see everything
    } else if (user.department) {
      setDepartmentFilter(user.department);
    }
  }, [user?.role, user?.department]);

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

      const filtered = filterFolders(data, searchQuery, departmentFilter);
      const sorted = sortFolders(filtered, sortBy);
      setFolders(sorted);
      setBreadcrumbs(buildBreadcrumbs(allLoadedFolders, currentFolderId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, searchQuery, departmentFilter, sortBy]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Handle view mode change
  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveViewPreference(mode);
  };

  // Navigate into folder
  const handleFolderClick = (folder: FileDirectory) => {
    const driveFolderId = folder.driveLink ? extractDriveFolderId(folder.driveLink) : null;

    if (driveFolderId) {
      setDriveMode({ folderId: driveFolderId, folderName: folder.name });
      return;
    }

    // Navigate as sub-folder tree
    setCurrentFolderId(folder.id);
  };

  // Navigate via breadcrumbs
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setDriveMode(null);
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
            className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </button>

          {breadcrumbs.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
              <button
                onClick={() => handleBreadcrumbClick(folder.id)}
                className={`hover:text-[var(--foreground)] transition-colors ${index === breadcrumbs.length - 1 && !driveMode
                  ? 'text-[var(--foreground)] font-medium'
                  : 'text-[var(--muted)]'
                  }`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}

          {driveMode && (
            <>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-[var(--foreground)] font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                {driveMode.folderName}
                <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-normal">(Live Drive)</span>
              </span>
            </>
          )}
        </div>

        {/* Toolbar — hide when in Drive mode */}
        {!driveMode && (
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-[var(--border)]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--card-surface)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--foreground)]"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 bg-[var(--card-surface)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] [color-scheme:light] dark:[color-scheme:dark]"
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
              className="px-4 py-2 bg-[var(--card-surface)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--foreground)] [color-scheme:light] dark:[color-scheme:dark]"
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

            {/* Add Folder */}
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Folder
            </Button>
          </div>
        )}

        {/* ── Drive Live Mode ── */}
        {driveMode ? (
          <DriveFileViewer
            rootFolderId={driveMode.folderId}
            rootFolderName={driveMode.folderName}
            onExit={() => setDriveMode(null)}
          />
        ) : loading ? (
          /* Loading state */
          <div className="flex items-center justify-center py-20 gap-3 text-[var(--muted)]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading folders...</span>
          </div>
        ) : folders.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <Folder className="w-16 h-16 mx-auto text-[var(--muted)] mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              No folders found
            </h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              {searchQuery || (departmentFilter && departmentFilter !== 'All Departments')
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first Drive folder'}
            </p>
            {!searchQuery && (!departmentFilter || departmentFilter === 'All Departments') && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Folder
              </Button>
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
