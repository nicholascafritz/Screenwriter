'use client';

import { useState, useRef, useEffect } from 'react';
import type { ProjectSummary } from '@/lib/store/types';
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

  return (
    <div
      className="group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
      onClick={() => {
        if (!renaming && !menuOpen) onOpen(project.id);
      }}
    >
      {/* Icon + Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
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
              className="bg-transparent border-b border-primary text-sm font-medium outline-none w-full text-foreground"
            />
          ) : (
            <span className="text-sm font-medium truncate">{project.name}</span>
          )}
        </div>

        {/* Menu button */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-50 w-36 rounded-md border border-border bg-popover py-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
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
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
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
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left text-destructive"
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
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {project.pageCount} {project.pageCount === 1 ? 'page' : 'pages'}
        </span>
        <span className="text-border">|</span>
        <span>
          {project.sceneCount} {project.sceneCount === 1 ? 'scene' : 'scenes'}
        </span>
      </div>

      {/* Date */}
      <div className="text-xs text-muted-foreground/70">
        {relativeTime(project.updatedAt)}
      </div>
    </div>
  );
}
