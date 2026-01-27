'use client';

import { useState, useRef, useEffect } from 'react';
import type { ProjectSummary } from '@/lib/store/types';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { FileText, MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';

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
// Types
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  /** Render as a compact row for list view */
  compact?: boolean;
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
  compact = false,
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

  // Derive display values
  const structureProgress = project.sceneCount > 0 ? Math.min((project.sceneCount / 12) * 100, 100) : 0;

  // Context menu (shared between compact and card views)
  const contextMenu = (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        className="p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 z-dropdown w-36 rounded-md border border-border bg-popover py-1 shadow-ds-lg">
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 text-left"
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
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 text-left"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onDuplicate(project.id);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 text-left text-danger"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              onDelete(project.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );

  // ---- Compact (list) layout ----
  if (compact) {
    return (
      <div
        className="group relative flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-normal hover:bg-surface-hover hover:border-[var(--color-border-strong)] cursor-pointer"
        onClick={() => {
          if (!renaming && !menuOpen) onOpen(project.id);
        }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
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
              className="bg-transparent border-b border-primary text-sm font-semibold outline-none w-full text-foreground"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground truncate block">{project.name}</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          <span>{project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}</span>
          <span>{project.sceneCount} {project.sceneCount === 1 ? 'scene' : 'scenes'}</span>
          <Badge variant="status" className="text-[10px]">In Development</Badge>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            {relativeTime(project.updatedAt)}
          </span>
        </div>
        {contextMenu}
      </div>
    );
  }

  // ---- Card (grid) layout ----
  return (
    <div
      className="group relative flex flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-all duration-normal hover:-translate-y-0.5 hover:shadow-ds-lg hover:border-[var(--color-border-strong)] cursor-pointer min-h-[280px]"
      onClick={() => {
        if (!renaming && !menuOpen) onOpen(project.id);
      }}
    >
      {/* Header: Icon + Title + Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
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
                className="bg-transparent border-b border-primary text-sm font-semibold outline-none w-full text-foreground"
              />
            ) : (
              <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
            )}
          </div>
        </div>

        {/* Menu button */}
        {contextMenu}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Stats row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}</span>
          <span className="opacity-50">&middot;</span>
          <span>{project.sceneCount} {project.sceneCount === 1 ? 'scene' : 'scenes'}</span>
        </div>

        {/* Structure progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Structure Progress
            </span>
            <span className="text-xs text-muted-foreground">
              {project.sceneCount}/12 beats
            </span>
          </div>
          <ProgressBar value={structureProgress} showShimmer={false} />
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="status">In Development</Badge>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          Last edited: {relativeTime(project.updatedAt)}
        </span>
      </div>
    </div>
  );
}
