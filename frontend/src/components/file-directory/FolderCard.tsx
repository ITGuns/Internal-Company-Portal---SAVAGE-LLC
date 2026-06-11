"use client";

import React from 'react';
import Card from '@/components/Card';
import { Folder, Trash2, FolderOpen } from 'lucide-react';
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
        className="flex items-center gap-4 p-4 border-b border-[var(--border)] hover:bg-[var(--card-surface)] transition-colors group relative"
      >
        <div className="relative">
          <Folder
            className="w-6 h-6 flex-shrink-0"
            style={{ color }}
            aria-hidden="true"
          />
          {childCount > 0 && (
            <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-blue-500 rounded-full text-[10px] font-bold text-white border border-white dark:border-[var(--card-bg)] shadow-sm">
              {childCount}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--foreground)] truncate">
            {folder.name}
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            {folder.department}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-bg)] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Open
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg opacity-0 transition-colors hover:bg-red-50 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 group-hover:opacity-100 dark:hover:bg-red-900/20"
              title="Delete folder"
              aria-label={`Delete ${folder.name}`}
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
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
        variant={hasAction ? "interactive" : "default"}
        padding="md"
        className="folder-card group relative cursor-pointer h-full"
      >
        {hasAction && (
          <button
            type="button"
            onClick={onClick}
            aria-label={`Open ${folder.name}`}
            className="absolute inset-0 z-10 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          />
        )}

        {childCount > 0 && (
          <div className="absolute top-3 left-3 min-w-[28px] h-7 px-2.5 flex items-center justify-center bg-[var(--card-surface)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--muted)] shadow-sm z-20">
            {childCount}
          </div>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 group-hover:opacity-100 dark:bg-red-900/20"
            title="Delete folder"
            aria-label={`Delete ${folder.name}`}
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: colorBg }}
          >
            {hasAction ? (
              <FolderOpen className="w-6 h-6" style={{ color }} aria-hidden="true" />
            ) : (
              <Folder className="w-6 h-6" style={{ color }} aria-hidden="true" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base text-[var(--foreground)] truncate mb-1">
              {folder.name}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {folder.department}
            </p>
          </div>
        </div>

      </Card>
    </div>
  );
}
