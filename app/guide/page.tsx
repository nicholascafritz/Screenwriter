'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project';
import { useStoryBibleStore } from '@/lib/store/story-bible';
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

  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const projectName = useProjectStore((s) => s.name);
  const loadForProject = useStoryBibleStore((s) => s.loadForProject);

  // Guide context from project creation form (stored in sessionStorage).
  const [guideContext, setGuideContext] = useState<{
    projectTitle?: string;
    genre?: string;
    logline?: string;
    notes?: string;
  }>({});

  const bibleLoaded = useRef(false);

  // Load guide context from sessionStorage.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('screenwriter:guideContext');
      if (stored) {
        setGuideContext(JSON.parse(stored));
        sessionStorage.removeItem('screenwriter:guideContext');
      }
    } catch {
      // Ignore parse errors.
    }
  }, []);

  // Guard: redirect to home if no active project.
  useEffect(() => {
    if (!activeProjectId) {
      router.replace('/');
    }
  }, [activeProjectId, router]);

  // Load the story bible for this project.
  useEffect(() => {
    if (activeProjectId && !bibleLoaded.current) {
      bibleLoaded.current = true;
      loadForProject(activeProjectId);
    }
  }, [activeProjectId, loadForProject]);

  // Watch for outline completion to auto-transition to summary.
  const outlineLength = useStoryBibleStore(
    (s) => s.bible?.outline?.length ?? 0,
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
    // Clear any existing outline first.
    useStoryBibleStore.getState().clearOutline();
  };

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
          <GuideSummary />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Chat area (left 2/3) */}
            <div className="flex-1 overflow-hidden border-r border-border">
              <GuideChat
                guideContext={{
                  projectTitle: guideContext.projectTitle || projectName,
                  genre: guideContext.genre,
                  logline: guideContext.logline,
                  notes: guideContext.notes,
                }}
                onRequestOutline={handleRequestOutline}
                isFinalizingOutline={isFinalizingOutline}
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
