"use client";

import React from 'react';
import Card from '@/components/Card';
import { Folder, ExternalLink, Trash2, FolderOpen } from 'lucide-react';
import { DEPARTMENT_COLORS, DEPARTMENT_COLORS_BG, getChildCount } from '@/lib/file-directory';
import type { FileDirectory } from '@/lib/file-directory-types';

interface FolderCardProps {
  folder: FileDirectory;
  onClick?: () => void;
  onDelete?: () => void;
  viewMode: 'grid' | 'list';
}

export default function FolderCard({ folder, onClick, onDelete, viewMode }: FolderCardProps) {
  const defaultColor = DEPARTMENT_COLORS[folder.department as keyof typeof DEPARTMENT_COLORS] || 'var(--muted)';
  const defaultColorBg = DEPARTMENT_COLORS_BG[folder.department as keyof typeof DEPARTMENT_COLORS_BG] || 'var(--card-surface)';
  
  // Use custom color if available, otherwise use department color
  const color = folder.customColor || defaultColor;
  const colorBg = folder.customColor 
    ? `${folder.customColor}15` // 15 = ~9% opacity in hex
    : defaultColorBg;
  
  const hasAction = Boolean(onClick);
  const childCount = getChildCount(folder.id);

  if (viewMode === 'list') {
    return (
      <div 
        className="flex items-center gap-4 p-4 border-b border-[var(--border)] hover:bg-[var(--card-surface)] transition-colors group cursor-pointer relative"
        onClick={onClick}
      >
        {childCount > 0 && (
          <div className="absolute top-2 right-2 min-w-[24px] h-6 px-2 flex items-center justify-center bg-[var(--card-bg)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--muted)]">
            {childCount}
          </div>
        )}
        
        <Folder 
          className="w-6 h-6 flex-shrink-0" 
          style={{ color }} 
        />
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--foreground)] truncate">
            {folder.name}
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            {folder.department}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {folder.driveLink && (
            <a
              href={folder.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-[var(--card-bg)] rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Open in Drive"
            >
              <ExternalLink className="w-4 h-4 text-[var(--muted)]" />
            </a>
          )}
          
          {hasAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-bg)] rounded-lg transition-colors"
            >
              Open
            </button>
          )}

          {folder.isCustom && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Delete folder"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div style={{ borderLeft: `4px solid ${color}` }}>
      <Card
        variant="interactive"
        padding="md"
        className="folder-card group relative cursor-pointer h-full"
        onClick={onClick}
      >
      {childCount > 0 && (
        <div className="absolute top-3 right-3 min-w-[28px] h-7 px-2.5 flex items-center justify-center bg-[var(--card-surface)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--muted)] shadow-sm z-20">
          {childCount}
        </div>
      )}
      
      {folder.isCustom && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 right-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-30"
          title="Delete folder"
        >
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: colorBg }}
        >
          {hasAction ? (
            <FolderOpen className="w-6 h-6" style={{ color }} />
          ) : (
            <Folder className="w-6 h-6" style={{ color }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-[var(--foreground)] truncate mb-1">
            {folder.name}
          </h3>
          <p className="text-sm text-[var(--muted)]">
            {folder.department}
          </p>
        </div>
      </div>

      {folder.driveLink && (
        <a
          href={folder.driveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
          Open in Drive
        </a>
      )}
    </Card>
    </div>
  );
}
