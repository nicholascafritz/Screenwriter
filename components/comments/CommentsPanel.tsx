'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useCommentStore } from '@/lib/store/comments';
import { useEditorStore } from '@/lib/store/editor';
import { useProjectStore } from '@/lib/store/project';
import { useOutlineStore } from '@/lib/store/outline';
import type { Comment } from '@/lib/store/comment-types';
import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Check,
  Trash2,
  RotateCcw,
  Plus,
} from 'lucide-react';
import CommentForm from './CommentForm';

interface CommentsPanelProps {
  className?: string;
}

type FilterMode = 'active' | 'resolved' | 'all';

export default function CommentsPanel({ className }: CommentsPanelProps) {
  const comments = useCommentStore((s) => s.comments);
  const activeCommentId = useCommentStore((s) => s.activeCommentId);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const unresolveComment = useCommentStore((s) => s.unresolveComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const setActiveComment = useCommentStore((s) => s.setActiveComment);
  const addComment = useCommentStore((s) => s.addComment);

  const content = useEditorStore((s) => s.content);
  const cursorLine = useEditorStore((s) => s.cursorLine);
  const selection = useEditorStore((s) => s.selection);
  const projectId = useProjectStore((s) => s.activeProjectId);
  const outlineScenes = useOutlineStore((s) => s.outline?.scenes ?? []);

  /** Map from SceneId → location name for display. */
  const sceneNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const scene of outlineScenes) {
      map.set(scene.id, scene.location || scene.heading || 'Untitled');
    }
    return map;
  }, [outlineScenes]);

  const [filter, setFilter] = useState<FilterMode>('active');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredComments = useMemo(() => {
    let filtered: Comment[];
    if (filter === 'active') {
      filtered = comments.filter((c) => !c.resolved);
    } else if (filter === 'resolved') {
      filtered = comments.filter((c) => c.resolved);
    } else {
      filtered = comments;
    }
    return filtered.sort((a, b) => a.startLine - b.startLine);
  }, [comments, filter]);

  const handleCommentClick = useCallback((comment: Comment) => {
    setActiveComment(comment.id);
    const handle = getEditorHandle();
    if (handle) {
      handle.revealLine(comment.startLine);
      handle.highlightLines(comment.startLine, comment.endLine);
      setTimeout(() => handle.clearHighlights(), 2000);
    }
  }, [setActiveComment]);

  const handleAddComment = useCallback(
    (text: string) => {
      if (!projectId) return;

      const lines = content.split('\n');
      const line = cursorLine;
      const anchorText = lines[line - 1]?.trim() ?? '';

      addComment({
        projectId,
        startLine: line,
        endLine: line,
        anchorText,
        content: text,
        author: 'user',
        resolved: false,
        sceneId: null,
      });
      setShowAddForm(false);
    },
    [addComment, content, cursorLine, projectId],
  );

  const activeCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          {(['active', 'resolved', 'all'] as FilterMode[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setFilter(f)}
            >
              {f === 'active' ? `Active (${activeCount})` : f === 'resolved' ? `Resolved (${resolvedCount})` : 'All'}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowAddForm(true)}
          title="Add comment at cursor"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Add comment form */}
      {showAddForm && (
        <div className="p-2 border-b border-border shrink-0">
          <CommentForm
            lineRange={`${cursorLine}`}
            onSubmit={handleAddComment}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Comments list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground py-8 px-4">
              <MessageSquare className="h-6 w-6 mb-2 opacity-40" />
              <p>No {filter === 'active' ? 'active' : filter === 'resolved' ? 'resolved' : ''} comments</p>
              <p className="mt-1 text-[10px]">
                Click + or select text and use the context menu to add comments.
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  'rounded-md border border-border p-2 text-xs cursor-pointer transition-colors',
                  activeCommentId === comment.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'hover:bg-muted/30',
                  comment.resolved && 'opacity-60',
                )}
                onClick={() => handleCommentClick(comment)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={comment.author === 'ai' ? 'default' : 'outline'}
                      className="text-[10px] h-4 px-1"
                    >
                      {comment.author === 'ai' ? 'AI' : 'You'}
                    </Badge>
                    <span className="text-muted-foreground">
                      L{comment.startLine}{comment.endLine !== comment.startLine ? `-${comment.endLine}` : ''}
                      {comment.sceneId && sceneNameMap.get(comment.sceneId) && (
                        <span className="ml-1 text-[10px]">
                          ({sceneNameMap.get(comment.sceneId)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {comment.resolved ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          unresolveComment(comment.id);
                        }}
                        title="Unresolve"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveComment(comment.id);
                        }}
                        title="Resolve"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteComment(comment.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-foreground/80">{comment.content}</p>
                {comment.anchorText && (
                  <p className="text-muted-foreground text-[10px] mt-1 truncate italic">
                    &quot;{comment.anchorText}&quot;
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
