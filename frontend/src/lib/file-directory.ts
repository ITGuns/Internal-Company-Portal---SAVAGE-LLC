/**
 * File Directory Data Management
 * 
 * Handles file directory data, navigation, filtering, and localStorage persistence.
 * Mock data is based on the Company File Directory spreadsheet.
 */

import type { DriveFile, FileDirectory } from './file-directory-types';

// ========== MOCK DATA (Based on Company File Directory Spreadsheet) ==========

export const MOCK_DIRECTORIES: FileDirectory[] = [];

const GOOGLE_DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

interface GoogleDriveFileResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
}

function getGoogleDriveApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
}

export async function fetchDriveFiles(folderId: string): Promise<DriveFile[]> {
  const apiKey = getGoogleDriveApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const query = `'${folderId}' in parents and trashed = false`;
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    fields: 'files(id,name,mimeType,webViewLink,size,modifiedTime,thumbnailLink)',
    orderBy: 'folder,name',
    pageSize: '1000',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  if (response.status === 403 || response.status === 404) {
    throw new Error('ACCESS_DENIED');
  }
  if (!response.ok) {
    throw new Error('Failed to load Google Drive files');
  }

  const data = await response.json() as { files?: GoogleDriveFileResponse[] };
  return (data.files || []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    isFolder: file.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE,
    driveLink: file.webViewLink || `https://drive.google.com/open?id=${file.id}`,
    size: file.size,
    modifiedTime: file.modifiedTime,
    thumbnailLink: file.thumbnailLink,
  }));
}

export type { DriveFile };

// ========== CUSTOM FOLDERS (User-Added via Frontend) ==========

const STORAGE_KEY = 'customDirectories';
const REMOVED_MOCK_KEY = 'removedMockDirectories';

export function getCustomFolders(): FileDirectory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading custom folders:', error);
    return [];
  }
}

export function getRemovedMockIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(REMOVED_MOCK_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCustomFolder(folder: Omit<FileDirectory, 'id'>): FileDirectory {
  const newFolder: FileDirectory = {
    ...folder,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  const existing = getCustomFolders();
  existing.push(newFolder);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error saving custom folder:', error);
  }

  return newFolder;
}

export function deleteCustomFolder(id: string): void {
  const allCustom = getCustomFolders();
  const allFolders = getAllFolders(); // All including mock

  const idsToDelete = new Set<string>([id]);
  const findDescendants = (parentId: string) => {
    allFolders.forEach(f => {
      if (f.parentId === parentId) {
        idsToDelete.add(f.id);
        findDescendants(f.id);
      }
    });
  };
  findDescendants(id);

  if (MOCK_DIRECTORIES.some(m => m.id === id)) {
    const removed = getRemovedMockIds();
    idsToDelete.forEach(idToDelete => {
      if (MOCK_DIRECTORIES.some(m => m.id === idToDelete) && !removed.includes(idToDelete)) {
        removed.push(idToDelete);
      }
    });
    localStorage.setItem(REMOVED_MOCK_KEY, JSON.stringify(removed));
  }

  const filtered = allCustom.filter(f => !idsToDelete.has(f.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting custom folder:', error);
  }
}

export function getAllFolders(): FileDirectory[] {
  const removedIds = getRemovedMockIds();
  const visibleMocks = MOCK_DIRECTORIES.filter(m => !removedIds.includes(m.id));
  return [...visibleMocks, ...getCustomFolders()];
}

// ========== NAVIGATION HELPERS ==========

export function getRootFolders(): FileDirectory[] {
  return getAllFolders().filter(f => f.parentId === null);
}

export function getChildren(parentId: string): FileDirectory[] {
  return getAllFolders().filter(f => f.parentId === parentId);
}

export function getChildCount(folderId: string): number {
  return getAllFolders().filter(f => f.parentId === folderId).length;
}

export function getBreadcrumbs(folderId: string | null): FileDirectory[] {
  if (!folderId) return [];

  const path: FileDirectory[] = [];
  const allFolders = getAllFolders();
  let current = allFolders.find(f => f.id === folderId);

  while (current) {
    path.unshift(current);
    current = current.parentId ? allFolders.find(f => f.id === current!.parentId) : undefined;
  }

  return path;
}

export function getFolderById(id: string): FileDirectory | undefined {
  return getAllFolders().find(f => f.id === id);
}

// ========== FILTERING & SEARCH ==========

export function filterFolders(
  folders: FileDirectory[],
  searchQuery?: string,
  departmentFilter?: string
): FileDirectory[] {
  return folders.filter(f => {
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase());

    // "All Departments" folders are always visible to every employee,
    // regardless of which department filter is active.
    // When departmentFilter is empty / 'All Departments' (Global view),
    // show everything.
    const matchesDept =
      !departmentFilter ||
      departmentFilter === 'All Departments' ||
      f.department === 'All Departments' ||
      f.department === departmentFilter;

    return matchesSearch && matchesDept;
  });
}

export function sortFolders(
  folders: FileDirectory[],
  sortBy: 'name' | 'department' | 'date'
): FileDirectory[] {
  const sorted = [...folders];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'department':
      return sorted.sort((a, b) => a.department.localeCompare(b.department));
    case 'date':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    default:
      return sorted;
  }
}

// ========== VIEW PREFERENCE ==========

const VIEW_STORAGE_KEY = 'fileDirectoryView';

export function getViewPreference(): 'grid' | 'list' {
  if (typeof window === 'undefined') return 'grid';
  try {
    return (localStorage.getItem(VIEW_STORAGE_KEY) as 'grid' | 'list') || 'grid';
  } catch {
    return 'grid';
  }
}

export function saveViewPreference(view: 'grid' | 'list'): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
  }
}

// ========== CONSTANTS ==========

export { DEPARTMENTS } from './departments';

export const DEPARTMENT_COLORS: Record<string, string> = {
  'Owners / Founders': '#111827',
  'Project Management': '#8b5cf6',
  'Operations': 'var(--dept-operations)',
  'Creatives': 'var(--dept-creatives)',
  'Finance': 'var(--dept-finance)',
  'Engineering': 'var(--dept-engineering)',
  'All Departments': '#6b7280',
  'Digital Marketing': '#a855f7',
  'Analytics / Data': '#06b6d4',
  'Automation / Tech': '#ec4899',
  'Website Developers': '#3b82f6',
  'Payroll / Finance': '#f59e0b',
};

export const DEPARTMENT_COLORS_BG: Record<string, string> = {
  'Owners / Founders': 'rgba(17, 24, 39, 0.1)',
  'Project Management': 'rgba(139, 92, 246, 0.1)',
  'Operations': 'var(--dept-operations-bg)',
  'Creatives': 'var(--dept-creatives-bg)',
  'Finance': 'var(--dept-finance-bg)',
  'Engineering': 'var(--dept-engineering-bg)',
  'All Departments': 'rgba(107, 114, 128, 0.1)',
  'Digital Marketing': 'rgba(168, 85, 247, 0.1)',
  'Analytics / Data': 'rgba(6, 182, 212, 0.1)',
  'Automation / Tech': 'rgba(236, 72, 153, 0.1)',
  'Website Developers': 'rgba(59, 130, 246, 0.1)',
  'Payroll / Finance': 'rgba(245, 158, 11, 0.1)',
};

export const PRESET_FOLDER_COLORS = [
  { name: 'Blue', value: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  { name: 'Purple', value: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  { name: 'Green', value: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { name: 'Amber', value: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { name: 'Red', value: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { name: 'Pink', value: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' },
  { name: 'Cyan', value: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
  { name: 'Orange', value: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  { name: 'Indigo', value: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  { name: 'Emerald', value: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  { name: 'Rose', value: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
  { name: 'Violet', value: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
];
