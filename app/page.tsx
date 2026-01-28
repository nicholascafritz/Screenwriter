'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project';
import { SAMPLE_SCRIPT } from '@/lib/store/editor';
import { processFiles } from '@/lib/upload/processor';
import { ACCEPTED_FILE_TYPES } from '@/lib/upload/processor';
import ProjectCard from '@/components/project/ProjectCard';
import FileDropZone from '@/components/upload/FileDropZone';
import AuthGate from '@/components/auth/AuthGate';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import NewProjectModal from '@/components/project/NewProjectModal';
import { Button } from '@/components/ui/button';
import { FilePlus, FileText, Upload, LayoutGrid, List } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const projects = useProjectStore((s) => s.projects);
  const createProject = useProjectStore((s) => s.createProject);
  const openProject = useProjectStore((s) => s.openProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const loadProjectList = useProjectStore((s) => s.loadProjectList);

  // Load project list on mount.
  useEffect(() => {
    loadProjectList();
  }, [loadProjectList]);

  // -- Handlers -------------------------------------------------------------

  const handleNewProject = async (name?: string, content?: string) => {
    await createProject(name, content);
    // Navigation is handled by the NewProjectModal's choice step.
  };

  const handleSampleProject = async () => {
    await createProject('The Last Draft', SAMPLE_SCRIPT);
    router.push('/editor');
  };

  const handleOpenProject = async (id: string) => {
    await openProject(id);
    router.push('/editor');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await importFiles(Array.from(files));
    // Reset the input so the same file can be re-selected.
    e.target.value = '';
  };

  const importFiles = useCallback(
    async (files: File[]) => {
      const processed = await processFiles(files);
      if (processed.length === 0) return;

      let lastId: string | undefined;
      for (const file of processed) {
        lastId = await createProject(file.name, file.content);
      }

      if (lastId) {
        if (processed.length > 1) {
          await openProject(lastId);
        }
        router.push('/editor');
      }
    },
    [createProject, openProject, router]
  );

  const handleDropFiles = useCallback(
    (files: File[]) => {
      importFiles(files);
    },
    [importFiles]
  );

  // -- Render ---------------------------------------------------------------

  const hasProjects = projects.length > 0;

  return (
    <AuthGate>
    <FileDropZone onFiles={handleDropFiles} className="min-h-screen">
      <div className="flex min-h-screen flex-col bg-background">
        {/* Navbar */}
        <Navbar />

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center px-8 py-12">
          {/* Hero Section */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {hasProjects ? 'Welcome Back' : 'Start Your First Screenplay'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md text-center">
              AI-powered screenplay IDE. Brainstorm, outline, draft, edit, and
              revise with real-time AI assistance.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-10">
            <Button size="lg" className="gap-2" onClick={() => setShowNewModal(true)}>
              <FilePlus className="h-4 w-4" />
              New Screenplay
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="gap-2"
              onClick={handleUploadClick}
            >
              <Upload className="h-4 w-4" />
              Upload Script
            </Button>
            {!hasProjects && (
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={handleSampleProject}
              >
                <FileText className="h-4 w-4" />
                Try Sample
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Project grid */}
          {hasProjects ? (
            <div className="w-full max-w-5xl">
              {/* Section header with view toggle */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Recent Projects
                </h2>
                <div className="flex items-center rounded-md border border-border p-0.5">
                  <button
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={handleOpenProject}
                      onRename={renameProject}
                      onDuplicate={duplicateProject}
                      onDelete={removeProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={handleOpenProject}
                      onRename={renameProject}
                      onDuplicate={duplicateProject}
                      onDelete={removeProject}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 mt-4 text-center">
              <div className="rounded-lg border-2 border-dashed border-border p-10">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drop .fountain, .fdx, or .txt files here to import
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer />

        {/* New Project Modal */}
        <NewProjectModal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          onCreate={handleNewProject}
        />
      </div>
    </FileDropZone>
    </AuthGate>
  );
}
