'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/lib/store/chat';
import { useProjectStore } from '@/lib/store/project';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';

interface ChatSessionListProps {
  className?: string;
}

export default function ChatSessionList({ className }: ChatSessionListProps) {
  const chatSessions = useChatStore((s) => s.chatSessions);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const switchSession = useChatStore((s) => s.switchSession);
  const createSession = useChatStore((s) => s.createSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNewChat = useCallback(async () => {
    if (!activeProjectId) return;
    const newId = await createSession(activeProjectId, 'New Chat');
    await switchSession(newId);
  }, [activeProjectId, createSession, switchSession]);

  const handleDoubleClick = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (editingId && editValue.trim()) {
      await renameSession(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, renameSession]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRenameSubmit();
      } else if (e.key === 'Escape') {
        setEditingId(null);
      }
    },
    [handleRenameSubmit],
  );

  const handleDelete = useCallback(
    async (id: string, messageCount: number) => {
      if (messageCount > 0 && confirmDeleteId !== id) {
        setConfirmDeleteId(id);
        return;
      }
      setConfirmDeleteId(null);
      await deleteSession(id);
    },
    [confirmDeleteId, deleteSession],
  );

  if (chatSessions.length === 0) return null;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Chats
        </span>
        <Tooltip content="New Chat">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={handleNewChat}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </Tooltip>
      </div>

      <div className="overflow-y-auto max-h-[140px] px-1.5 pb-1.5 space-y-0.5">
        {chatSessions.map((session) => {
          const isActive = session.id === activeChatId;
          const isBranch = !!session.parentChatId;

          return (
            <div
              key={session.id}
              className={cn(
                'group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs cursor-pointer transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
              onClick={() => {
                if (!isActive && editingId !== session.id) {
                  switchSession(session.id);
                }
              }}
              onDoubleClick={() => handleDoubleClick(session.id, session.name)}
            >
              {/* Active indicator */}
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0',
                  isActive ? 'bg-primary' : 'bg-transparent',
                )}
              />

              {/* Branch icon with tooltip */}
              {isBranch && (
                <Tooltip
                  content={`Branched from ${chatSessions.find((s) => s.id === session.parentChatId)?.name ?? 'parent'}`}
                  side="right"
                >
                  <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                </Tooltip>
              )}

              {/* Session name */}
              {editingId === session.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleRenameKeyDown}
                  className="flex-1 min-w-0 bg-transparent border-b border-primary text-xs outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate min-w-0">{session.name}</span>
              )}

              {/* Message count */}
              {!editingId && session.messageCount > 0 && (
                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                  {session.messageCount}
                </span>
              )}

              {/* Delete button */}
              {editingId !== session.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(session.id, session.messageCount);
                  }}
                  className={cn(
                    'shrink-0 p-0.5 rounded transition-opacity',
                    confirmDeleteId === session.id
                      ? 'opacity-100 text-destructive'
                      : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive',
                  )}
                  title={confirmDeleteId === session.id ? 'Click again to confirm' : 'Delete chat'}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
