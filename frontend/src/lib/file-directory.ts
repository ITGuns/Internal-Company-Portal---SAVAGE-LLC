/**
 * File Directory Data Management
 * 
 * Handles file directory data, navigation, filtering, and localStorage persistence.
 * Mock data is based on the Company File Directory spreadsheet.
 */

import type { FileDirectory } from './file-directory-types';

// ========== MOCK DATA (Based on Company File Directory Spreadsheet) ==========

export const MOCK_DIRECTORIES: FileDirectory[] = [];

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
    const matchesDept = !departmentFilter || f.department === departmentFilter;
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

// ========== VALIDATION ==========

export function isValidDriveLink(url: string): boolean {
  return /drive\.google\.com/.test(url) && (
    /folders\/[a-zA-Z0-9_-]+/.test(url) ||
    /[?&]id=[a-zA-Z0-9_-]+/.test(url)
  );
}

export function extractDriveFolderId(url: string): string | null {
  if (!url) return null;
  const folderMatch = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
}

export interface DriveSubfolder {
  id: string;
  name: string;
  driveLink: string;
  mimeType: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  driveLink: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Fetches immediate contents (used by AddFolderModal preview).
 * Returns both subfolders for importing and a count of files for feedback.
 */
export async function fetchDriveSubfolders(folderId: string): Promise<{ name: string, subfolders: DriveSubfolder[], fileCount: number }> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  try {
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name&key=${apiKey}`;
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent('files(id,name,mimeType)');
    const childrenUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}&pageSize=1000`;

    const [metaRes, childrenRes] = await Promise.all([
      fetch(metaUrl),
      fetch(childrenUrl)
    ]);

    if (!metaRes.ok || !childrenRes.ok) {
      const res = !metaRes.ok ? metaRes : childrenRes;
      const err = await res.json().catch(() => ({}));
      if (res.status === 403 || res.status === 404) {
        throw new Error('ACCESS_DENIED');
      }
      throw new Error(err?.error?.message || 'FAILED_TO_FETCH');
    }

    const [metaData, childrenData] = await Promise.all([
      metaRes.json(),
      childrenRes.json()
    ]);

    const folderName = metaData.name;
    const files = childrenData.files || [];

    const subfolders = files
      .filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        driveLink: `https://drive.google.com/drive/folders/${f.id}`,
      }));

    const fileCount = files.length - subfolders.length;

    return { name: folderName, subfolders, fileCount };
  } catch (err) {
    console.error('Failed to fetch Drive subfolders:', err);
    throw err;
  }
}

/**
 * Fetches ALL contents (files + folders) of a Drive folder for the inline Drive browser.
 */
export async function fetchDriveFiles(folderId: string): Promise<DriveFile[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  try {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent(
      'files(id,name,mimeType,iconLink,thumbnailLink,size,modifiedTime,webViewLink)'
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}&pageSize=1000&orderBy=folder,name`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403 || res.status === 404) {
        throw new Error('ACCESS_DENIED');
      }
      throw new Error(err?.error?.message || 'FAILED_TO_FETCH');
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => {
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        isFolder,
        driveLink: isFolder
          ? `https://drive.google.com/drive/folders/${f.id}`
          : (f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`),
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        size: f.size,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
      };
    });
  } catch (err) {
    console.error('Failed to fetch Drive files:', err);
    throw err;
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
  'Operations': 'var(--dept-operations)',
  'Creatives': 'var(--dept-creatives)',
  'Finance': 'var(--dept-finance)',
  'Engineering': 'var(--dept-engineering)',
  'All Departments': '#6b7280',
  'Website Developers': '#3b82f6',
  'Operations Manager': '#10b981',
  'Payroll / Finance': '#f59e0b',
  'Digital Marketing Lead / Marketing VA': '#a855f7',
  'Analytics / Data VA': '#06b6d4',
  'Automation / Tech VA': '#ec4899',
  'Project Managers': '#8b5cf6',
};

export const DEPARTMENT_COLORS_BG: Record<string, string> = {
  'Operations': 'var(--dept-operations-bg)',
  'Creatives': 'var(--dept-creatives-bg)',
  'Finance': 'var(--dept-finance-bg)',
  'Engineering': 'var(--dept-engineering-bg)',
  'All Departments': 'rgba(107, 114, 128, 0.1)',
  'Website Developers': 'rgba(59, 130, 246, 0.1)',
  'Operations Manager': 'rgba(16, 185, 129, 0.1)',
  'Payroll / Finance': 'rgba(245, 158, 11, 0.1)',
  'Digital Marketing Lead / Marketing VA': 'rgba(168, 85, 247, 0.1)',
  'Analytics / Data VA': 'rgba(6, 182, 212, 0.1)',
  'Automation / Tech VA': 'rgba(236, 72, 153, 0.1)',
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
