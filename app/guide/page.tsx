'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useOutlineStore } from '@/lib/store/outline';
import { useGuideChatStore } from '@/lib/store/guide-chat';
import AuthGate from '@/components/auth/AuthGate';
import GuideChat from '@/components/guide/GuideChat';
import GuideSidebar from '@/components/guide/GuideSidebar';
import GuideSummary from '@/components/guide/GuideSummary';
import GuideProgress from '@/components/guide/GuideProgress';
import { Button } from '@/components/ui/button';
import { Clapperboard, X } from 'lucide-react';

type GuidePhase = 'chat' | 'summary';

export default function GuidePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<GuidePhase>('chat');
  const [isFinalizingOutline, setIsFinalizingOutline] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const userId = useProjectStore((s) => s.userId);
  const projectName = useProjectStore((s) => s.name);
  const loadForProject = useStoryBibleStore((s) => s.loadForProject);

  // Guide chat store
  const loadGuideSessions = useGuideChatStore((s) => s.loadSessionsForProject);
  const setGuideContext = useGuideChatStore((s) => s.setGuideContext);
  const resetGuideChat = useGuideChatStore((s) => s.reset);

  const bibleLoaded = useRef(false);
  const guideLoaded = useRef(false);

  // Load guide context from sessionStorage on mount.
  // This is used when creating a new project from the dashboard.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('screenwriter:guideContext');
      if (stored) {
        const context = JSON.parse(stored);
        setGuideContext({
          projectTitle: context.projectTitle || projectName,
          genre: context.genre,
          logline: context.logline,
          notes: context.notes,
        });
        // Clear sessionStorage after loading into store
        sessionStorage.removeItem('screenwriter:guideContext');
      } else if (projectName) {
        // No sessionStorage context, but we have a project name
        setGuideContext({ projectTitle: projectName });
      }
    } catch {
      // Ignore parse errors.
    }
  }, [projectName, setGuideContext]);

  // Guard: redirect to home if no active project.
  useEffect(() => {
    if (!activeProjectId) {
      router.replace('/');
    }
  }, [activeProjectId, router]);

  // Load the story bible and outline for this project.
  useEffect(() => {
    if (activeProjectId && !bibleLoaded.current) {
      bibleLoaded.current = true;
      loadForProject(activeProjectId);
      useOutlineStore.getState().loadForProject(activeProjectId);
    }
  }, [activeProjectId, loadForProject]);

  // Load guide chat sessions for this project.
  useEffect(() => {
    if (activeProjectId && userId && !guideLoaded.current) {
      guideLoaded.current = true;
      loadGuideSessions(userId, activeProjectId);
    }
  }, [activeProjectId, userId, loadGuideSessions]);

  // Reset guide chat when unmounting or switching projects
  useEffect(() => {
    return () => {
      // Reset refs when component unmounts
      bibleLoaded.current = false;
      guideLoaded.current = false;
    };
  }, [activeProjectId]);

  // Watch for outline completion to auto-transition to summary.
  const outlineLength = useOutlineStore(
    (s) => s.outline?.scenes.length ?? 0,
  );

  useEffect(() => {
    // Transition to summary when outline generation produces scenes
    // and we were in the finalizing state.
    if (isFinalizingOutline && outlineLength > 0) {
      // Wait a bit to allow the AI to finish generating all scenes.
      const timer = setTimeout(() => {
        setPhase('summary');
        setIsFinalizingOutline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isFinalizingOutline, outlineLength]);

  const handleRequestOutline = () => {
    setIsFinalizingOutline(true);
    setIsGeneratingScenes(true);
    // Remove existing planned scenes before regeneration.
    const outlineStore = useOutlineStore.getState();
    const planned = outlineStore.outline?.scenes.filter(
      (s) => s.fountainRange === null,
    ) ?? [];
    for (const scene of planned) {
      outlineStore.removeScene(scene.id);
    }
  };

  const handleStreamingComplete = useCallback(() => {
    setIsGeneratingScenes(false);
  }, []);

  const handleExit = () => {
    router.push('/editor');
  };

  if (!activeProjectId) {
    return null;
  }

  return (
    <AuthGate>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              title="Back to projects"
            >
              <Clapperboard className="h-5 w-5 text-primary" />
            </button>
            <span className="font-semibold text-sm text-foreground">
              {projectName}
            </span>
            <span className="text-xs text-muted-foreground">
              &mdash; Story Development Guide
            </span>
          </div>

          <div className="flex items-center gap-3">
            <GuideProgress />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleExit}
            >
              <X className="h-3.5 w-3.5" />
              Skip to Editor
            </Button>
          </div>
        </header>

        {/* Main content */}
        {phase === 'summary' ? (
          <GuideSummary isGenerating={isGeneratingScenes} />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Chat area (left 2/3) */}
            <div className="flex-1 overflow-hidden border-r border-border">
              <GuideChat
                onRequestOutline={handleRequestOutline}
                isFinalizingOutline={isFinalizingOutline}
                onStreamingComplete={handleStreamingComplete}
              />
            </div>

            {/* Sidebar (right 1/3) */}
            <div className="w-80 shrink-0 overflow-hidden bg-surface">
              <GuideSidebar />
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
