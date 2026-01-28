'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/lib/store/editor';
import { useChatStore, TRUST_LEVEL_CONFIG, type TrustLevel } from '@/lib/store/chat';
import { useProjectStore, getPersistedActiveProjectId } from '@/lib/store/project';
import { debounce } from '@/lib/utils';
import { processFiles } from '@/lib/upload/processor';
import AuthGate from '@/components/auth/AuthGate';
import ScreenplayEditor from '@/components/editor/ScreenplayEditor';
import DiffViewer from '@/components/editor/DiffViewer';
import ScreenplayPreview from '@/components/editor/ScreenplayPreview';
import ExportMenu from '@/components/editor/ExportMenu';
import ChatPanel from '@/components/chat/ChatPanel';
import OutlinePanel from '@/components/outline/OutlinePanel';
import ChangeLogPanel from '@/components/changelog/ChangeLogPanel';
import CommentsPanel from '@/components/comments/CommentsPanel';
import StoryBiblePanel from '@/components/storybible/StoryBiblePanel';
import OperationLog from '@/components/editor/OperationLog';
import LiveEditHighlight from '@/components/editor/LiveEditHighlight';
import FileDropZone from '@/components/upload/FileDropZone';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { useTimelineStore } from '@/lib/store/timeline';
import { useCommentStore } from '@/lib/store/comments';
import { useOperationsStore } from '@/lib/store/operations';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  Code,
  FileText,
  Clapperboard,
  Undo2,
  Redo2,
  Clock,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

type LeftPanelTab = 'outline' | 'history' | 'comments' | 'bible';

type ViewMode = 'editor' | 'preview' | 'split';

export default function EditorPage() {
  const router = useRouter();

  const [showOutline, setShowOutline] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [showDiff, setShowDiff] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState('');
  const [diffModified, setDiffModified] = useState('');
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('outline');

  // Resize state
  const [outlineWidth, setOutlineWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(380);
  const resizingRef = useRef<'outline' | 'chat' | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const screenplay = useEditorStore((s) => s.screenplay);
  const currentScene = useEditorStore((s) => s.currentScene);
  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);
  const isDirty = useEditorStore((s) => s.isDirty);
  const undoEdit = useEditorStore((s) => s.undoEdit);
  const redoEdit = useEditorStore((s) => s.redoEdit);
  const canUndo = useTimelineStore((s) => s.canUndo);
  const canRedo = useTimelineStore((s) => s.canRedo);
  const activeCommentCount = useCommentStore((s) => s.comments.filter((c) => !c.resolved).length);
  const isAIActive = useOperationsStore((s) => s.isAIActive);
  const trustLevel = useChatStore((s) => s.trustLevel);
  const setTrustLevel = useChatStore((s) => s.setTrustLevel);
  const projectName = useProjectStore((s) => s.name);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject);
  const createProject = useProjectStore((s) => s.createProject);
  const openProject = useProjectStore((s) => s.openProject);

  // -- Project restoration / guard ------------------------------------------
  // On mount (e.g. page refresh), try to restore the last active project
  // from localStorage. If that fails, redirect to the home page.
  const [isRestoring, setIsRestoring] = useState(false);
  const restorationAttempted = useRef(false);

  useEffect(() => {
    if (activeProjectId) return; // Already have a project loaded.
    if (restorationAttempted.current) {
      // We already tried restoring — give up and redirect.
      router.replace('/');
      return;
    }

    restorationAttempted.current = true;
    const persistedId = getPersistedActiveProjectId();
    if (!persistedId) {
      router.replace('/');
      return;
    }

    // Try to re-open the persisted project (loads all data including chat).
    setIsRestoring(true);
    openProject(persistedId).then((ok) => {
      setIsRestoring(false);
      if (!ok) {
        router.replace('/');
      }
    });
  }, [activeProjectId, openProject, router]);

  // -- Auto-save (1.5s debounce) -------------------------------------------
  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        useProjectStore.getState().saveCurrentProject();
      }, 1500),
    []
  );

  // Trigger auto-save when content, name, or voiceId changes.
  const voiceId = useProjectStore((s) => s.voiceId);
  useEffect(() => {
    if (!activeProjectId) return;
    debouncedSave();
  }, [content, projectName, voiceId, activeProjectId, debouncedSave]);

  // -- File drop handler ----------------------------------------------------
  const handleDropFiles = useCallback(
    async (files: File[]) => {
      const processed = await processFiles(files);
      if (processed.length === 0) return;
      // Save current project first.
      await saveCurrentProject();
      // Create a new project from the first dropped file and open it.
      const file = processed[0];
      await createProject(file.name, file.content);
      // For additional files, create projects but don't navigate away.
      for (let i = 1; i < processed.length; i++) {
        await createProject(processed[i].name, processed[i].content);
      }
      // Re-open the first dropped file's project (createProject already set it).
      // No need to re-open since createProject sets activeProjectId.
    },
    [saveCurrentProject, createProject]
  );

  // Resize handlers
  const handleMouseDown = useCallback(
    (panel: 'outline' | 'chat', e: React.MouseEvent) => {
      resizingRef.current = panel;
      startXRef.current = e.clientX;
      startWidthRef.current = panel === 'outline' ? outlineWidth : chatWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [outlineWidth, chatWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = e.clientX - startXRef.current;
      if (resizingRef.current === 'outline') {
        setOutlineWidth(Math.max(180, Math.min(400, startWidthRef.current + delta)));
      } else {
        setChatWidth(Math.max(300, Math.min(600, startWidthRef.current - delta)));
      }
    };
    const handleMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Diff handlers
  const handleAcceptDiff = useCallback(() => {
    setContent(diffModified);
    setShowDiff(false);
  }, [diffModified, setContent]);

  const handleRejectDiff = useCallback(() => {
    setShowDiff(false);
  }, []);

  // Changelog: view a diff from a timeline entry
  const handleViewChangeLogDiff = useCallback((entry: import('@/lib/diff/types').TimelineEntry) => {
    setDiffOriginal(entry.diff.originalText);
    setDiffModified(entry.diff.modifiedText);
    setShowDiff(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // Cmd+Shift shortcuts
        if (e.shiftKey) {
          switch (e.key) {
            case 'm':
            case 'M':
              // Cmd+Shift+M: Cycle through trust levels
              e.preventDefault();
              setTrustLevel(((trustLevel + 1) % 4) as TrustLevel);
              return;
            case '1':
              // Cmd+Shift+1: Brainstorm mode
              e.preventDefault();
              setTrustLevel(0);
              return;
            case '2':
              // Cmd+Shift+2: Review mode
              e.preventDefault();
              setTrustLevel(1);
              return;
            case '3':
              // Cmd+Shift+3: Edit mode
              e.preventDefault();
              setTrustLevel(2);
              return;
            case '4':
              // Cmd+Shift+4: Auto mode
              e.preventDefault();
              setTrustLevel(3);
              return;
          }
        }

        switch (e.key) {
          case 'b':
            e.preventDefault();
            setShowOutline((v) => !v);
            break;
          case 'j':
            e.preventDefault();
            setShowChat((v) => !v);
            break;
          case '\\':
            e.preventDefault();
            setViewMode((v) => (v === 'editor' ? 'preview' : v === 'preview' ? 'split' : 'editor'));
            break;
          case 's':
            e.preventDefault();
            useProjectStore.getState().saveCurrentProject();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              useEditorStore.getState().redoEdit();
            } else {
              useEditorStore.getState().undoEdit();
            }
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trustLevel, setTrustLevel]);

  const pageCount = screenplay?.pageCount ?? 0;
  const sceneCount = screenplay?.scenes?.length ?? 0;
  const characterCount = screenplay?.characters?.length ?? 0;

  // Don't render until we have a project (may be restoring from localStorage).
  if (!activeProjectId || isRestoring) {
    return null;
  }

  return (
    <AuthGate>
    <FileDropZone onFiles={handleDropFiles} className="h-screen">
      <div className="flex h-screen flex-col bg-background">
        {/* Top Bar */}
        <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                saveCurrentProject();
                router.push('/');
              }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              title="Back to projects"
            >
              <Clapperboard className="h-5 w-5 text-primary" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {projectName}
                {isDirty && <span className="text-muted-foreground ml-1">*</span>}
              </span>
              {sceneCount > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-md border border-border bg-background p-0.5">
              <Tooltip content="Code Editor (Cmd+\)">
                <Button
                  variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('editor')}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Preview">
                <Button
                  variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Split View">
                <Button
                  variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('split')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5">
              <Tooltip content="Undo (Cmd+Z)">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!canUndo()}
                  onClick={undoEdit}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Redo (Cmd+Shift+Z)">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!canRedo()}
                  onClick={redoEdit}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            {/* Save & Export */}
            <ExportMenu />

            {/* Panel toggles */}
            <Tooltip content="Toggle Outline (Cmd+B)">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowOutline((v) => !v)}
              >
                {showOutline ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>
            <Tooltip content="Toggle Chat (Cmd+J)">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowChat((v) => !v)}
              >
                {showChat ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel (Outline / History) */}
          {showOutline && (
            <>
              <div
                className="flex-shrink-0 border-r border-border overflow-hidden flex flex-col"
                style={{ width: outlineWidth }}
              >
                {/* Tab bar */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border shrink-0">
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      leftPanelTab === 'outline'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setLeftPanelTab('outline')}
                  >
                    <FileText className="h-3 w-3" />
                    Outline
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      leftPanelTab === 'history'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setLeftPanelTab('history')}
                  >
                    <Clock className="h-3 w-3" />
                    History
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      leftPanelTab === 'comments'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setLeftPanelTab('comments')}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Notes
                    {activeCommentCount > 0 && (
                      <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground px-1">
                        {activeCommentCount}
                      </span>
                    )}
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      leftPanelTab === 'bible'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setLeftPanelTab('bible')}
                  >
                    <BookOpen className="h-3 w-3" />
                    Bible
                  </button>
                </div>
                {/* Tab content */}
                {leftPanelTab === 'outline' ? (
                  <OutlinePanel className="flex-1 overflow-hidden" />
                ) : leftPanelTab === 'history' ? (
                  <ChangeLogPanel className="flex-1 overflow-hidden" onViewDiff={handleViewChangeLogDiff} />
                ) : leftPanelTab === 'comments' ? (
                  <CommentsPanel className="flex-1 overflow-hidden" />
                ) : (
                  <StoryBiblePanel className="flex-1 overflow-hidden" />
                )}
              </div>
              <div
                className="resize-handle"
                onMouseDown={(e) => handleMouseDown('outline', e)}
              />
            </>
          )}

          {/* Editor / Preview Area */}
          <div className="flex-1 flex overflow-hidden relative">
            <LiveEditHighlight />
            <OperationLog />
            {showDiff ? (
              <DiffViewer
                original={diffOriginal}
                modified={diffModified}
                onAccept={handleAcceptDiff}
                onReject={handleRejectDiff}
                className="flex-1"
              />
            ) : (
              <>
                {(viewMode === 'editor' || viewMode === 'split') && (
                  <div className={viewMode === 'split' ? 'flex-1 border-r border-border' : 'flex-1'}>
                    <ScreenplayEditor className="h-full" />
                  </div>
                )}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div className="flex-1 overflow-auto">
                    <ScreenplayPreview className="h-full" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chat Panel */}
          {showChat && (
            <>
              <div
                className="resize-handle"
                onMouseDown={(e) => handleMouseDown('chat', e)}
              />
              <div
                className="flex-shrink-0 border-l border-border overflow-hidden"
                style={{ width: chatWidth }}
              >
                <ChatPanel className="h-full" />
              </div>
            </>
          )}
        </div>

        {/* Status Bar */}
        <footer className="flex h-7 items-center justify-between border-t border-border px-3 text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
            <span className="text-border">|</span>
            <span>{sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}</span>
            <span className="text-border">|</span>
            <span>{characterCount} {characterCount === 1 ? 'character' : 'characters'}</span>
            {activeCommentCount > 0 && (
              <>
                <span className="text-border">|</span>
                <span>{activeCommentCount} {activeCommentCount === 1 ? 'note' : 'notes'}</span>
              </>
            )}
            {currentScene && (
              <>
                <span className="text-border">|</span>
                <span className="text-foreground/70 truncate max-w-[200px]">
                  {currentScene}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAIActive && (
              <span className="text-primary text-[10px] font-medium animate-pulse">
                AI editing...
              </span>
            )}
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {TRUST_LEVEL_CONFIG[trustLevel].label}
            </Badge>
            <span>Fountain</span>
          </div>
        </footer>
      </div>
    </FileDropZone>
    </AuthGate>
  );
}
