'use client';

// ---------------------------------------------------------------------------
// SceneContextMenu -- Right-click context menu for outline scene cards
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';
import type { OutlineEntry } from '@/lib/store/outline-types';
import type { BeatSheetEntry } from '@/lib/store/story-bible-types';
import {
  Pencil,
  Music,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SceneContextMenuProps {
  entry: OutlineEntry;
  beats: BeatSheetEntry[];
  onEditSummary: () => void;
  onAssignBeat: (beatId: string) => void;
  onUnassignBeat: () => void;
  onChangeStatus: (status: OutlineEntry['status']) => void;
  onDelete: () => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
  children: React.ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: OutlineEntry['status']; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'drafted', label: 'Drafted' },
  { value: 'revised', label: 'Revised' },
  { value: 'locked', label: 'Locked' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SceneContextMenu({
  entry,
  beats,
  onEditSummary,
  onAssignBeat,
  onUnassignBeat,
  onChangeStatus,
  onDelete,
  onAddAbove,
  onAddBelow,
  children,
}: SceneContextMenuProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [submenu, setSubmenu] = useState<'beat' | 'status' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = position !== null;
  const isDrafted = entry.fountainRange !== null;

  // -- Open on right-click --------------------------------------------------

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Position the menu, clamping near viewport edges.
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setPosition({ x, y });
    setSubmenu(null);
  }, []);

  // -- Close ----------------------------------------------------------------

  const close = useCallback(() => {
    setPosition(null);
    setSubmenu(null);
  }, []);

  // Close on click outside.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  // -- Menu item helper -----------------------------------------------------

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    danger,
    hasSubmenu,
    onMouseEnter,
  }: {
    icon?: React.ElementType;
    label: string;
    onClick?: () => void;
    danger?: boolean;
    hasSubmenu?: boolean;
    onMouseEnter?: () => void;
  }) => (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        danger && 'text-red-400 hover:text-red-300',
      )}
      onClick={() => {
        onClick?.();
        if (!hasSubmenu) close();
      }}
      onMouseEnter={onMouseEnter}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="flex-1 text-left">{label}</span>
      {hasSubmenu && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
    </button>
  );

  const MenuSeparator = () => (
    <div className="my-1 h-px bg-border -mx-1" />
  );

  // -- Render ---------------------------------------------------------------

  return (
    <div onContextMenu={handleContextMenu}>
      {children}

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] min-w-[180px] rounded-md border border-border
                       bg-popover p-1 text-popover-foreground shadow-lg
                       animate-in fade-in-0 zoom-in-95"
            style={{ left: position.x, top: position.y }}
          >
            {/* Edit Summary */}
            <MenuItem
              icon={Pencil}
              label="Edit Summary"
              onClick={onEditSummary}
            />

            <MenuSeparator />

            {/* Assign Beat submenu */}
            <div className="relative">
              <MenuItem
                icon={Music}
                label={entry.beatId ? 'Change Beat' : 'Assign Beat'}
                hasSubmenu
                onMouseEnter={() => setSubmenu('beat')}
              />
              {submenu === 'beat' && (
                <div
                  className="absolute left-full top-0 ml-1 min-w-[160px] max-h-[240px]
                             overflow-y-auto rounded-md border border-border bg-popover
                             p-1 text-popover-foreground shadow-lg z-[101]"
                >
                  {beats.length === 0 ? (
                    <div className="px-2.5 py-1.5 text-xs text-muted-foreground italic">
                      No beats defined
                    </div>
                  ) : (
                    <>
                      {beats.map((beat) => (
                        <button
                          key={beat.id}
                          type="button"
                          className={cn(
                            'flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                          )}
                          onClick={() => {
                            onAssignBeat(beat.id);
                            close();
                          }}
                        >
                          <span className="w-3.5 flex items-center justify-center shrink-0">
                            {entry.beatId === beat.id && (
                              <Check className="h-3 w-3" />
                            )}
                          </span>
                          <span className="flex-1 text-left truncate">
                            {beat.beat}
                          </span>
                        </button>
                      ))}
                      {entry.beatId && (
                        <>
                          <div className="my-1 h-px bg-border -mx-1" />
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-sm
                                       text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => {
                              onUnassignBeat();
                              close();
                            }}
                          >
                            Unassign Beat
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Change Status submenu */}
            <div className="relative">
              <MenuItem
                icon={ShieldCheck}
                label="Change Status"
                hasSubmenu
                onMouseEnter={() => setSubmenu('status')}
              />
              {submenu === 'status' && (
                <div
                  className="absolute left-full top-0 ml-1 min-w-[120px]
                             rounded-md border border-border bg-popover
                             p-1 text-popover-foreground shadow-lg z-[101]"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        'flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                      )}
                      onClick={() => {
                        onChangeStatus(opt.value);
                        close();
                      }}
                    >
                      <span className="w-3.5 flex items-center justify-center shrink-0">
                        {entry.status === opt.value && (
                          <Check className="h-3 w-3" />
                        )}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <MenuSeparator />

            {/* Add scene above / below */}
            <MenuItem icon={Plus} label="Add Scene Above" onClick={onAddAbove} />
            <MenuItem icon={Plus} label="Add Scene Below" onClick={onAddBelow} />

            <MenuSeparator />

            {/* Delete */}
            <MenuItem
              icon={Trash2}
              label={isDrafted ? 'Remove from Outline' : 'Delete Scene'}
              onClick={onDelete}
              danger
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
