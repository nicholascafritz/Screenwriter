'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project';
import { SAMPLE_SCRIPT } from '@/lib/store/editor';
import { processFiles } from '@/lib/upload/processor';
import { ACCEPTED_FILE_TYPES } from '@/lib/upload/processor';
import ProjectCard from '@/components/project/ProjectCard';
import FileDropZone from '@/components/upload/FileDropZone';
import { Button } from '@/components/ui/button';
import { FilePlus, FileText, Upload, Clapperboard } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleNewProject = () => {
    createProject();
    router.push('/editor');
  };

  const handleSampleProject = () => {
    createProject('The Last Draft', SAMPLE_SCRIPT);
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

      // For multiple files, create a project for each.
      // Open the last one (most recently processed).
      let lastId: string | undefined;
      for (const file of processed) {
        lastId = createProject(file.name, file.content);
      }

      if (lastId) {
        // The createProject call already sets the active project,
        // but if we created multiple we need to open the last one.
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
    <FileDropZone onFiles={handleDropFiles} className="min-h-screen">
      <div className="flex min-h-screen flex-col items-center p-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mt-12 mb-10">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Screenwriter</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            AI-powered screenplay IDE. Brainstorm, outline, draft, edit, and
            revise with real-time AI assistance.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-8">
          <Button size="lg" className="gap-2" onClick={handleNewProject}>
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
              Sample Script
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
          <div className="w-full max-w-4xl">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Your Projects
            </h2>
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
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-8 text-center">
            <div className="rounded-lg border-2 border-dashed border-border p-10">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Drop .fountain, .fdx, or .txt files here to import
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-sm text-muted-foreground flex flex-col items-center gap-2 mt-auto pt-12 pb-4">
          <p>Fountain format &middot; Claude AI &middot; Monaco Editor</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Inline Edits
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Diff Review
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Agent Mode
            </span>
          </div>
        </div>
      </div>
    </FileDropZone>
  );
}
