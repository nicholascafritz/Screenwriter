'use client';

import { useState, useRef, useEffect } from 'react';
import type { ProjectSummary, ProjectStatus } from '@/lib/store/types';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { FileText, MoreVertical, Pencil, Copy, Trash2, Star, Archive, Film, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ---------------------------------------------------------------------------
// Status and genre configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: BadgeProps['variant'] }> = {
  'outline': { label: 'Outline', variant: 'info' },
  'draft-1': { label: 'Draft 1', variant: 'warning' },
  'in-progress': { label: 'In Progress', variant: 'status' },
  'complete': { label: 'Complete', variant: 'success' },
};

const GENRE_LABELS: Record<string, string> = {
  'action': 'Action',
  'comedy': 'Comedy',
  'drama': 'Drama',
  'horror': 'Horror',
  'sci-fi': 'Sci-Fi',
  'thriller': 'Thriller',
  'romance': 'Romance',
  'documentary': 'Documentary',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  /** Render as a compact row for list view */
  compact?: boolean;
  /** Whether selection mode is active */
  selectionMode?: boolean;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (id: string, selected: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectCard({
  project,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
  compact = false,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Focus input when entering rename mode.
  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== project.name) {
      onRename(project.id, trimmed);
    } else {
      setRenameValue(project.name);
    }
    setRenaming(false);
  };

  // Derive display values - progress based on page count toward typical feature length (110 pages)
  const scriptProgress = project.pageCount > 0 ? Math.min((project.pageCount / 110) * 100, 100) : 0;

  // Context menu (shared between compact and card views)
  const contextMenu = (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        className="p-1 rounded hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-gray-700 bg-gray-900/95 backdrop-blur-sm py-1 shadow-lg">
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-800 text-left text-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              setRenameValue(project.name);
              setRenaming(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-800 text-left text-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onDuplicate(project.id);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          {onToggleArchive && (
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-800 text-left text-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onToggleArchive(project.id);
              }}
            >
              <Archive className="h-3.5 w-3.5" />
              {project.isArchived ? 'Unarchive' : 'Archive'}
            </button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-red-500/10 text-left text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{project.name}&rdquo; and all its data
                  including chat history, outline, and story bible.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMenuOpen(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(project.id);
                  }}
                >
                  Delete Project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );

  // ---- Compact (list) layout ----
  if (compact) {
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['outline'];
    return (
      <div
        className={cn(
          "group relative flex items-center gap-4 rounded-lg border bg-gray-900 px-4 py-3 transition-all cursor-pointer",
          isSelected
            ? "border-amber-500 bg-amber-500/5"
            : "border-gray-800 hover:bg-gray-800/50 hover:border-gray-700"
        )}
        onClick={() => {
          if (selectionMode && onSelectionChange) {
            onSelectionChange(project.id, !isSelected);
          } else if (!renaming && !menuOpen) {
            onOpen(project.id);
          }
        }}
      >
        {/* Selection checkbox */}
        {selectionMode && (
          <button
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-amber-500 border-amber-500 text-gray-950"
                : "border-gray-700 hover:border-amber-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange?.(project.id, !isSelected);
            }}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </button>
        )}
        {/* Favorite button */}
        {!selectionMode && onToggleFavorite && (
          <button
            className={cn(
              "p-1 rounded transition-all flex-shrink-0",
              project.isFavorite
                ? "text-amber-400"
                : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(project.id);
            }}
          >
            <Star className={cn("h-4 w-4", project.isFavorite && "fill-current")} />
          </button>
        )}
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
          <FileText className="h-4 w-4 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') {
                  setRenameValue(project.name);
                  setRenaming(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-b border-amber-400 text-sm font-semibold outline-none w-full text-gray-100"
            />
          ) : (
            <span className="text-sm font-semibold text-gray-100 truncate block">{project.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          <span>{project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}</span>
          <span>{project.sceneCount} {project.sceneCount === 1 ? 'scene' : 'scenes'}</span>
          <Badge variant={statusConfig.variant} className="text-[10px]">
            {statusConfig.label}
          </Badge>
          {project.genre && (
            <Badge variant="secondary" className="text-[10px]">
              <Film className="h-2.5 w-2.5 mr-1" />
              {GENRE_LABELS[project.genre] || project.genre}
            </Badge>
          )}
          <span className="text-[11px] text-gray-600">
            {relativeTime(project.updatedAt)}
          </span>
        </div>
        {!selectionMode && contextMenu}
      </div>
    );
  }

  // ---- Card (grid) layout ----
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['outline'];

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-4 rounded-lg border bg-gray-900 p-6 transition-all cursor-pointer min-h-[280px]",
        isSelected
          ? "border-amber-500 bg-amber-500/5"
          : "border-gray-800 hover:-translate-y-0.5 hover:shadow-lg hover:border-gray-700"
      )}
      onClick={() => {
        if (selectionMode && onSelectionChange) {
          onSelectionChange(project.id, !isSelected);
        } else if (!renaming && !menuOpen) {
          onOpen(project.id);
        }
      }}
    >
      {/* Selection checkbox - top left corner */}
      {selectionMode && (
        <button
          className={cn(
            "absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all z-10",
            isSelected
              ? "bg-amber-500 border-amber-500 text-gray-950"
              : "border-gray-700 bg-gray-900 hover:border-amber-500"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectionChange?.(project.id, !isSelected);
          }}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>
      )}
      {/* Header: Icon + Title + Favorite + Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10">
            <FileText className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setRenameValue(project.name);
                    setRenaming(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-amber-400 text-sm font-semibold outline-none w-full text-gray-100"
              />
            ) : (
              <h3 className="text-sm font-semibold text-gray-100 truncate">{project.name}</h3>
            )}
          </div>
        </div>

        {/* Favorite + Menu buttons */}
        {!selectionMode && (
          <div className="flex items-center gap-1">
            {onToggleFavorite && (
              <button
                className={cn(
                  "p-1 rounded transition-all",
                  project.isFavorite
                    ? "text-amber-400"
                    : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(project.id);
                }}
              >
                <Star className={cn("h-4 w-4", project.isFavorite && "fill-current")} />
              </button>
            )}
            {contextMenu}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Stats row */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}</span>
          <span className="opacity-50">&middot;</span>
          <span>{project.sceneCount} {project.sceneCount === 1 ? 'scene' : 'scenes'}</span>
        </div>

        {/* Script progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Script Progress
            </span>
            <span className="text-xs text-gray-500">
              {project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}
            </span>
          </div>
          <ProgressBar value={scriptProgress} showShimmer={false} />
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          {project.genre && (
            <Badge variant="secondary">
              <Film className="h-3 w-3 mr-1" />
              {GENRE_LABELS[project.genre] || project.genre}
            </Badge>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-800">
        <span className="text-[11px] text-gray-600">
          Last edited: {relativeTime(project.updatedAt)}
        </span>
      </div>
    </div>
  );
}
