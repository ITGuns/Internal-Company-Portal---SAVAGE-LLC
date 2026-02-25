"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FolderCard from '@/components/file-directory/FolderCard';
import AddFolderModal from '@/components/file-directory/AddFolderModal';
import { useToast } from '@/components/ToastProvider';
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
  DEPARTMENTS,
} from '@/lib/file-directory';
import type { FileDirectory } from '@/lib/file-directory-types';

export default function FileDirectoryPage() {
  const toast = useToast();
  
  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FileDirectory[]>([]);
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getViewPreference());
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'date'>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Data
  const [folders, setFolders] = useState<FileDirectory[]>([]);

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

  // Navigate into folder
  const handleFolderClick = (folder: FileDirectory) => {
    if (folder.driveLink && getChildren(folder.id).length === 0) {
      // If no children, just open Drive link
      window.open(folder.driveLink, '_blank');
    } else {
      // Navigate into folder
      setCurrentFolderId(folder.id);
    }
  };

  // Navigate via breadcrumbs
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Handle folder deletion
  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to remove this folder from the directory?')) {
      deleteCustomFolder(folderId);
      // Reload folders
      setFolders(prev => prev.filter(f => f.id !== folderId));
      toast.success('Folder removed');
    }
  };

  // Handle successful folder addition
  const handleFolderAdded = (newFolder: FileDirectory) => {
    // Reload folders to include new one
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
                className={`hover:text-[var(--foreground)] transition-colors ${
                  index === breadcrumbs.length - 1
                    ? 'text-[var(--foreground)] font-medium'
                    : 'text-[var(--muted)]'
                }`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar */}
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
            <option value="">All Departments</option>
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

        {/* Content Area */}
        {folders.length === 0 ? (
          <div className="text-center py-20">
            <Folder className="w-16 h-16 mx-auto text-[var(--muted)] mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              No folders found
            </h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              {searchQuery || departmentFilter
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first Drive folder'
              }
            </p>
            {!searchQuery && !departmentFilter && (
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
                  onDelete={folder.isCustom ? () => handleDeleteFolder(folder.id) : undefined}
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
                onDelete={folder.isCustom ? () => handleDeleteFolder(folder.id) : undefined}
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
