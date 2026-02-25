/**
 * File Directory Type Definitions
 * 
 * TypeScript interfaces for Company File Directory feature.
 * These types are designed to work with both frontend (localStorage)
 * and backend (database) implementations.
 */

import type { Department } from './departments';

export interface FileDirectory {
  id: string;                    // "custom-{timestamp}" for frontend, cuid() for backend
  name: string;                  // Folder name
  type: 'folder' | 'file';       // Currently only 'folder' is used
  department: string;            // Operations, Creatives, Finance, Engineering
  driveLink?: string;            // Google Drive URL (optional)
  parentId: string | null;       // Hierarchical parent (null = root level)
  itemCount?: number;            // Number of items inside (optional)
  customColor?: string;          // Custom folder color (overrides department color)
  createdAt?: string;            // ISO date string
  updatedAt?: string;            // ISO date string
  isCustom?: boolean;            // Flag for user-added folders (frontend only)
  metadata?: {
    description?: string;
    tags?: string[];
    permissions?: string[];      // Role-based access (future feature)
  };
}

export interface DirectoryView {
  currentPath: FileDirectory[];  // Breadcrumb trail
  folders: FileDirectory[];      // Current level folders
  filterDepartment?: string;    // Department filter
  searchQuery?: string;          // Search query
  viewMode: 'grid' | 'list';    // Display mode
  sortBy: 'name' | 'department' | 'date'; // Sort option
}

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'department' | 'date';

// Re-export Department type from centralized source
export type { Department };
