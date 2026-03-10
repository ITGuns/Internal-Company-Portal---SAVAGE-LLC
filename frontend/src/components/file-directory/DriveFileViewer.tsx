"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Folder,
    FolderOpen,
    File,
    FileText,
    Image,
    Video,
    Music,
    Archive,
    Code,
    Table2,
    Presentation,
    RefreshCw,
    ExternalLink,
    ChevronRight,
    Loader2,
    AlertCircle,
    UploadCloud,
    Home,
} from 'lucide-react';
import { fetchDriveFiles } from '@/lib/file-directory';
import type { DriveFile } from '@/lib/file-directory';

// ---- helpers ----

function getMimeIcon(mimeType: string, isFolder: boolean) {
    if (isFolder) return <FolderOpen className="w-5 h-5 text-amber-500" />;
    if (mimeType.includes('image')) return <Image className="w-5 h-5 text-purple-500" />;
    if (mimeType.includes('video')) return <Video className="w-5 h-5 text-rose-500" />;
    if (mimeType.includes('audio')) return <Music className="w-5 h-5 text-pink-400" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv'))
        return <Table2 className="w-5 h-5 text-green-500" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
        return <Presentation className="w-5 h-5 text-orange-500" />;
    if (mimeType.includes('pdf'))
        return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('document') || mimeType.includes('word'))
        return <FileText className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar'))
        return <Archive className="w-5 h-5 text-yellow-600" />;
    if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css'))
        return <Code className="w-5 h-5 text-cyan-500" />;
    return <File className="w-5 h-5 text-[var(--muted)]" />;
}

function formatSize(bytes?: string): string {
    if (!bytes) return '';
    const b = parseInt(bytes);
    if (isNaN(b)) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

// ---- types ----

interface BreadcrumbEntry {
    id: string;
    name: string;
}

interface DriveFileViewerProps {
    /** Root Google Drive folder ID to browse */
    rootFolderId: string;
    /** Display name of the root folder (for breadcrumb) */
    rootFolderName: string;
    /** Called when user clicks the back/Home breadcrumb to exit Drive mode */
    onExit: () => void;
}

// ---- component ----

export default function DriveFileViewer({
    rootFolderId,
    rootFolderName,
    onExit,
}: DriveFileViewerProps) {
    const [stack, setStack] = useState<BreadcrumbEntry[]>([{ id: rootFolderId, name: rootFolderName }]);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshAt, setRefreshAt] = useState(0);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const currentEntry = stack[stack.length - 1];

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchDriveFiles(currentEntry.id);
            setFiles(result);
        } catch (err) {
            if (err instanceof Error && err.message === 'API_KEY_MISSING') {
                setError('Google Drive API Key is missing. Please contact your admin.');
            } else if (err instanceof Error && err.message === 'ACCESS_DENIED') {
                setError('Access denied. Please ensure the Drive folder is shared as "Anyone with the link".');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to load folder contents.');
            }
        } finally {
            setLoading(false);
        }
    }, [currentEntry.id, refreshAt]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        load();
    }, [load]);

    const navigateInto = (file: DriveFile) => {
        if (!file.isFolder) {
            window.open(file.driveLink, '_blank');
            return;
        }
        setStack(prev => [...prev, { id: file.id, name: file.name }]);
    };

    const navigateTo = (index: number) => {
        setStack(prev => prev.slice(0, index + 1));
    };

    const refresh = () => setRefreshAt(Date.now());

    const openInDrive = () => {
        window.open(
            `https://drive.google.com/drive/folders/${currentEntry.id}`,
            '_blank'
        );
    };

    const folders = files.filter(f => f.isFolder);
    const fileItems = files.filter(f => !f.isFolder);

    return (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card-bg)]">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--card-surface)] border-b border-[var(--border)] flex-wrap">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
                    <button
                        onClick={onExit}
                        className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        <Home className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Directory</span>
                    </button>

                    {stack.map((entry, i) => (
                        <React.Fragment key={entry.id}>
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] flex-shrink-0" />
                            <button
                                onClick={() => navigateTo(i)}
                                className={`text-sm truncate max-w-[140px] transition-colors ${i === stack.length - 1
                                    ? 'text-[var(--foreground)] font-medium'
                                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                    }`}
                                title={entry.name}
                            >
                                {entry.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--card-bg)] transition-colors disabled:opacity-50"
                        title="Refresh from Drive"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <button
                        onClick={openInDrive}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--card-bg)] transition-colors text-blue-600 dark:text-blue-400"
                        title="Open in Google Drive (to upload files)"
                    >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload in Drive
                    </button>

                    {/* View toggle */}
                    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-[var(--card-bg)] font-semibold' : 'hover:bg-[var(--card-bg)]'}`}
                            title="Grid view"
                            aria-label="Grid view"
                            aria-pressed={viewMode === 'grid'}
                        >
                            ▦
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-2.5 py-1.5 text-xs border-l border-[var(--border)] transition-colors ${viewMode === 'list' ? 'bg-[var(--card-bg)] font-semibold' : 'hover:bg-[var(--card-bg)]'}`}
                            title="List view"
                            aria-label="List view"
                            aria-pressed={viewMode === 'list'}
                        >
                            ☰
                        </button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 min-h-[200px]">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--muted)]">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm">Loading Drive contents…</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-500">
                        <AlertCircle className="w-8 h-8" />
                        <p className="text-sm text-center max-w-sm">{error}</p>
                        <button
                            onClick={refresh}
                            className="mt-2 px-4 py-2 text-sm rounded-lg border border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && files.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--muted)]">
                        <Folder className="w-12 h-12 opacity-40" />
                        <p className="text-sm">This folder is empty</p>
                        <button
                            onClick={openInDrive}
                            className="flex items-center gap-2 mt-2 px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-[var(--card-surface)] transition-colors text-blue-600 dark:text-blue-400"
                        >
                            <UploadCloud className="w-4 h-4" />
                            Upload files in Drive
                        </button>
                    </div>
                )}

                {!loading && !error && files.length > 0 && (
                    <>
                        {/* Folders section */}
                        {folders.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                                    Folders ({folders.length})
                                </p>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {folders.map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => navigateInto(f)}
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group text-center"
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 group-hover:scale-110 transition-transform">
                                                    <FolderOpen className="w-6 h-6 text-amber-500" />
                                                </div>
                                                <span className="text-xs font-medium text-[var(--foreground)] leading-tight line-clamp-2 w-full">
                                                    {f.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                                        {folders.map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => navigateInto(f)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors text-left group"
                                            >
                                                <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                                <span className="flex-1 text-sm font-medium text-[var(--foreground)] truncate">{f.name}</span>
                                                <ChevronRight className="w-4 h-4 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Files section */}
                        {fileItems.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                                    Files ({fileItems.length})
                                </p>
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {fileItems.map(f => (
                                            <a
                                                key={f.id}
                                                href={f.driveLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group text-center"
                                                title={f.name}
                                            >
                                                {f.thumbnailLink ? (
                                                    <img
                                                        src={f.thumbnailLink}
                                                        alt={f.name}
                                                        className="w-10 h-10 object-cover rounded-lg"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 flex items-center justify-center">
                                                        {getMimeIcon(f.mimeType, false)}
                                                    </div>
                                                )}
                                                <span className="text-xs font-medium text-[var(--foreground)] leading-tight line-clamp-2 w-full">
                                                    {f.name}
                                                </span>
                                                {f.size && (
                                                    <span className="text-[10px] text-[var(--muted)]">{formatSize(f.size)}</span>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
                                        {fileItems.map(f => (
                                            <a
                                                key={f.id}
                                                href={f.driveLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--card-surface)] transition-colors group"
                                            >
                                                {getMimeIcon(f.mimeType, false)}
                                                <span className="flex-1 text-sm text-[var(--foreground)] truncate">{f.name}</span>
                                                {f.size && (
                                                    <span className="text-xs text-[var(--muted)] flex-shrink-0">{formatSize(f.size)}</span>
                                                )}
                                                {f.modifiedTime && (
                                                    <span className="text-xs text-[var(--muted)] flex-shrink-0 hidden sm:block">
                                                        {formatDate(f.modifiedTime)}
                                                    </span>
                                                )}
                                                <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)] opacity-0 group-hover:opacity-100 flex-shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer status bar */}
            <div className="px-4 py-2 bg-[var(--card-surface)] border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
                <span>
                    {!loading && !error
                        ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}, ${fileItems.length} file${fileItems.length !== 1 ? 's' : ''}`
                        : loading ? 'Loading…' : 'Error loading'}
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    Live from Google Drive
                </span>
            </div>
        </div>
    );
}
