'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Select } from '@/components/ui/select';
import { FilePlus, FileText, Upload, LayoutGrid, List, Star, Archive, ArrowUpDown, Filter, Trash2, X, CheckSquare } from 'lucide-react';
import type { ProjectMetadata } from '@/lib/store/project';
import type { ProjectStatus } from '@/lib/store/types';
import { cn } from '@/lib/utils';

// Filter and sort options
type FilterStatus = 'all' | ProjectStatus;
type SortOption = 'updated' | 'created' | 'name' | 'pages';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'outline', label: 'Outline' },
  { value: 'draft-1', label: 'Draft 1' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

const GENRE_OPTIONS = [
  { value: '', label: 'All Genres' },
  { value: 'action', label: 'Action' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'drama', label: 'Drama' },
  { value: 'horror', label: 'Horror' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'romance', label: 'Romance' },
  { value: 'documentary', label: 'Documentary' },
];

const SORT_OPTIONS = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Date Created' },
  { value: 'name', label: 'Name' },
  { value: 'pages', label: 'Page Count' },
];

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort state
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [sortAsc, setSortAsc] = useState(false);

  const projects = useProjectStore((s) => s.projects);
  const userId = useProjectStore((s) => s.userId);
  const createProject = useProjectStore((s) => s.createProject);
  const openProject = useProjectStore((s) => s.openProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const removeProject = useProjectStore((s) => s.removeProject);
  const loadProjectList = useProjectStore((s) => s.loadProjectList);
  const toggleFavorite = useProjectStore((s) => s.toggleFavorite);
  const toggleArchive = useProjectStore((s) => s.toggleArchive);
  const bulkDeleteProjects = useProjectStore((s) => s.bulkDeleteProjects);
  const bulkToggleArchive = useProjectStore((s) => s.bulkToggleArchive);

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filter by archive status
    result = result.filter((p) => (showArchived ? p.isArchived : !p.isArchived));

    // Filter by favorites
    if (showFavoritesOnly) {
      result = result.filter((p) => p.isFavorite);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    // Filter by genre
    if (filterGenre) {
      result = result.filter((p) => p.genre === filterGenre);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'updated':
          cmp = b.updatedAt - a.updatedAt;
          break;
        case 'created':
          cmp = b.createdAt - a.createdAt;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'pages':
          cmp = b.pageCount - a.pageCount;
          break;
      }
      return sortAsc ? -cmp : cmp;
    });

    return result;
  }, [projects, showArchived, showFavoritesOnly, filterStatus, filterGenre, sortBy, sortAsc]);

  // Load project list when userId becomes available.
  useEffect(() => {
    if (userId) {
      loadProjectList();
    }
  }, [userId, loadProjectList]);

  // -- Handlers -------------------------------------------------------------

  const handleNewProject = async (name?: string, content?: string, metadata?: ProjectMetadata) => {
    await createProject(name, content, metadata);
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

  // Selection handlers
  const handleSelectionChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
  }, [filteredProjects]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.size} project${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`);
    if (confirmed) {
      await bulkDeleteProjects(Array.from(selectedIds));
      handleExitSelectionMode();
    }
  }, [selectedIds, bulkDeleteProjects, handleExitSelectionMode]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await bulkToggleArchive(Array.from(selectedIds), !showArchived);
    handleExitSelectionMode();
  }, [selectedIds, bulkToggleArchive, showArchived, handleExitSelectionMode]);

  // -- Render ---------------------------------------------------------------

  const hasProjects = projects.length > 0;
  const hasFilteredProjects = filteredProjects.length > 0;
  const isFiltered = filterStatus !== 'all' || filterGenre !== '' || showFavoritesOnly || showArchived;

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
            <h1 className="text-display-md font-bold tracking-tight text-gray-100">
              {hasProjects ? 'Welcome Back' : 'Start Your First Screenplay'}
            </h1>
            <p className="text-sm text-gray-500 max-w-md text-center">
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
              {/* Bulk action bar */}
              {selectionMode && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary border border-border">
                  <button
                    onClick={handleExitSelectionMode}
                    className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                    title="Exit selection mode"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-foreground">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      Select all ({filteredProjects.length})
                    </button>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={handleDeselectAll}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Deselect all
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleBulkArchive}
                      disabled={selectedIds.size === 0}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {showArchived ? 'Unarchive' : 'Archive'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.size === 0}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              {/* Section header with view toggle */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">
                  {showArchived ? 'Archived Projects' : 'Recent Projects'}
                  {isFiltered && (
                    <span className="text-muted-foreground font-normal ml-2">
                      ({filteredProjects.length} of {projects.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {/* Select mode toggle */}
                  {!selectionMode && filteredProjects.length > 0 && (
                    <button
                      className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setSelectionMode(true)}
                      title="Select projects"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* View mode toggle */}
                  <div className="flex items-center rounded-md border border-border p-0.5 bg-secondary">
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-background text-foreground shadow-sm'
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
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setViewMode('list')}
                      title="List view"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                {/* Status filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    options={STATUS_OPTIONS}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="h-8 text-xs min-w-[120px]"
                  />
                </div>

                {/* Genre filter */}
                <Select
                  options={GENRE_OPTIONS}
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="h-8 text-xs min-w-[120px]"
                />

                {/* Favorites toggle */}
                <button
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border',
                    showFavoritesOnly
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : 'text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                  )}
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                >
                  <Star className={cn('h-3.5 w-3.5', showFavoritesOnly && 'fill-current')} />
                  Favorites
                </button>

                {/* Archive toggle */}
                <button
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border',
                    showArchived
                      ? 'bg-muted text-foreground border-foreground/30'
                      : 'text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                  )}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  {showArchived ? 'Archived' : 'Show Archived'}
                </button>

                {/* Sort dropdown */}
                <div className="ml-auto flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-8 text-xs min-w-[120px]"
                  />
                  <button
                    className="p-1.5 rounded border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setSortAsc(!sortAsc)}
                    title={sortAsc ? 'Ascending' : 'Descending'}
                  >
                    <ArrowUpDown className={cn('h-3.5 w-3.5', sortAsc && 'rotate-180')} />
                  </button>
                </div>
              </div>

              {/* Project list */}
              {hasFilteredProjects ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onOpen={handleOpenProject}
                        onRename={renameProject}
                        onDuplicate={duplicateProject}
                        onDelete={removeProject}
                        onToggleFavorite={toggleFavorite}
                        onToggleArchive={toggleArchive}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(project.id)}
                        onSelectionChange={handleSelectionChange}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onOpen={handleOpenProject}
                        onRename={renameProject}
                        onDuplicate={duplicateProject}
                        onDelete={removeProject}
                        onToggleFavorite={toggleFavorite}
                        onToggleArchive={toggleArchive}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(project.id)}
                        onSelectionChange={handleSelectionChange}
                        compact
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No projects match your filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterGenre('');
                      setShowFavoritesOnly(false);
                      setShowArchived(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 mt-4 text-center">
              <div className="rounded-lg border-2 border-dashed border-gray-700 p-10 hover:border-amber-500/50 transition-colors">
                <Upload className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
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
