"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FolderCard from '@/components/file-directory/FolderCard';
import AddFolderModal from '@/components/file-directory/AddFolderModal';
import DriveFileViewer from '@/components/file-directory/DriveFileViewer';
import { useToast } from '@/components/ToastProvider';
import { useUser } from '@/contexts/UserContext';
import {
  Folder,
  Plus,
  Search,
  Grid,
  List,
  ChevronRight,
  Home,
} from 'lucide-react';
import {
  getRootFolders,
  getChildren,
  getBreadcrumbs,
  filterFolders,
  sortFolders,
  getViewPreference,
  saveViewPreference,
  deleteCustomFolder,
  extractDriveFolderId,
  DEPARTMENTS,
} from '@/lib/file-directory';
import type { FileDirectory, Department } from '@/lib/file-directory-types';

// Drive live mode state
interface DriveMode {
  folderId: string;
  folderName: string;
}

export default function FileDirectoryPage() {
  const toast = useToast();
  const { user } = useUser();

  // Standard navigation state (mock/custom folder tree)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FileDirectory[]>([]);

  // Drive Live Mode — when browsing a real Drive folder inline
  const [driveMode, setDriveMode] = useState<DriveMode | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getViewPreference());
  const [searchQuery, setSearchQuery] = useState('');
  // Default to the logged-in user's department so they see their folders
  // + all "All Departments" folders automatically.
  // Falls back to 'All Departments' (global view) if department is unknown.
  const [departmentFilter, setDepartmentFilter] = useState<string>('All Departments');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'date'>('name');
  const [showAddModal, setShowAddModal] = useState(false);

  // Data
  const [folders, setFolders] = useState<FileDirectory[]>([]);

  // When user loads, set the department filter based on their role:
  // - Admins see everything (All Departments / global view)
  // - Regular employees default to their own department
  //   (they still see "All Departments" folders thanks to filterFolders logic)
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      setDepartmentFilter('All Departments'); // admins see all folders
    } else if (user.department) {
      setDepartmentFilter(user.department);
    }
  }, [user?.role, user?.department]);

  // Load folders when navigation changes
  useEffect(() => {
    const loadFolders = () => {
      const newFolders = currentFolderId
        ? getChildren(currentFolderId)
        : getRootFolders();

      const filtered = filterFolders(newFolders, searchQuery, departmentFilter);
      const sorted = sortFolders(filtered, sortBy);

      setFolders(sorted);
      setBreadcrumbs(getBreadcrumbs(currentFolderId));
    };

    loadFolders();
  }, [currentFolderId, searchQuery, departmentFilter, sortBy]);

  // Handle view mode change
  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    saveViewPreference(mode);
  };

  // Navigate into folder — enter Drive Live Mode for custom folders w/ real Drive links
  const handleFolderClick = (folder: FileDirectory) => {
    const driveFolderId = folder.driveLink ? extractDriveFolderId(folder.driveLink) : null;
    const mockChildren = getChildren(folder.id);

    // Enter Drive Live Mode if folder has a valid Drive ID
    if (driveFolderId) {
      setDriveMode({ folderId: driveFolderId, folderName: folder.name });
      return;
    }

    // Fallback: Mock folder navigation if no Drive ID but has children in code
    if (mockChildren.length > 0) {
      setCurrentFolderId(folder.id);
      return;
    }

    // Final fallback: External link
    if (folder.driveLink) {
      window.open(folder.driveLink, '_blank');
    }
  };

  // Navigate via breadcrumbs
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setDriveMode(null);
  };

  // Handle folder deletion
  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to remove this folder from the directory?')) {
      deleteCustomFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      toast.success('Folder removed');
    }
  };

  // Handle successful folder addition
  const handleFolderAdded = (newFolder: FileDirectory) => {
    const newFolders = currentFolderId
      ? getChildren(currentFolderId)
      : getRootFolders();

    const filtered = filterFolders(newFolders, searchQuery, departmentFilter);
    const sorted = sortFolders(filtered, sortBy);
    setFolders(sorted);

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
              {DEPARTMENTS.map((dept) => (
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
        ) : (
          /* ── Mock / Custom Folder Tree ── */
          folders.length === 0 ? (
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
          )
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
