// ---------------------------------------------------------------------------
// Project Store -- Zustand state management for multi-project CRUD
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type { ProjectData, ProjectSummary } from './types';
import {
  loadProjectIndex,
  loadProject,
  saveProject,
  deleteProject as deleteProjectFromStorage,
  getActiveProjectId,
  setActiveProjectId,
} from './persistence';
import { useEditorStore } from './editor';
import { useChatStore } from './chat';
import { useTimelineStore } from './timeline';
import { useCommentStore } from './comments';
import { useStoryBibleStore } from './story-bible';
import {
  loadSessionsForProject as loadChatSessionsForProject,
  saveSession as saveChatSession,
  deleteSessionsForProject,
  type ChatSession,
} from './chat-persistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectState {
  /** Display name of the current screenplay project. */
  name: string;

  /** ID of the currently active voice profile used for AI interactions. */
  voiceId: string;

  /** ID of the currently open project, or `null` if none is loaded. */
  activeProjectId: string | null;

  /** Lightweight project summaries for the home-page grid. */
  projects: ProjectSummary[];

  // -- Actions --------------------------------------------------------------

  /** Update the project name. */
  setName: (name: string) => void;

  /** Update the active voice profile. */
  setVoiceId: (id: string) => void;

  /** Refresh the project list from localStorage. */
  loadProjectList: () => void;

  /**
   * Create a new project with optional initial content.
   * Sets it as the active project and populates the editor.
   * Returns the new project ID.
   */
  createProject: (name?: string, content?: string) => string;

  /**
   * Open an existing project by ID.
   * Loads from localStorage, migrates legacy chatHistory to IndexedDB
   * if needed, and loads chat sessions.
   * Returns `true` if the project was found and loaded.
   */
  openProject: (id: string) => Promise<boolean>;

  /**
   * Save the current project state to localStorage.
   * Chat messages are persisted to IndexedDB separately.
   */
  saveCurrentProject: () => void;

  /** Rename a project (updates localStorage and in-memory list). */
  renameProject: (id: string, newName: string) => void;

  /** Delete a project and clear active state if it was the current one. */
  removeProject: (id: string) => Promise<void>;

  /**
   * Duplicate a project.  Creates a copy with a new ID and "(Copy)" suffix.
   * Returns the new project ID.
   */
  duplicateProject: (id: string) => string | null;

  /** Reset all stores (editor, chat, timeline) to their initial states. */
  resetStores: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default content for a brand-new screenplay. */
function defaultContent(): string {
  return `Title: Untitled Screenplay
Credit: Written by
Author:
Draft date: ${new Date().toLocaleDateString()}
Contact:

`;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useProjectStore = create<ProjectState>((set, get) => ({
  // -- Initial state --------------------------------------------------------
  name: 'Untitled Screenplay',
  voiceId: 'default',
  activeProjectId: null,
  projects: [],

  // -- Actions --------------------------------------------------------------

  setName: (name: string) => {
    set({ name });
  },

  setVoiceId: (id: string) => {
    set({ voiceId: id });
  },

  loadProjectList: () => {
    const projects = loadProjectIndex();
    // Sort by most recently updated first.
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ projects });
  },

  createProject: (name?: string, content?: string) => {
    const id = generateId();
    const now = Date.now();
    const projectName = name ?? 'Untitled Screenplay';
    const projectContent = content ?? defaultContent();

    // Reset all stores before loading new state.
    get().resetStores();

    // Set project metadata.
    set({
      activeProjectId: id,
      name: projectName,
      voiceId: 'default',
    });

    // Populate the editor.
    const editorStore = useEditorStore.getState();
    editorStore.setContent(projectContent);
    // Set the baseline for undo/redo diffing.
    useEditorStore.setState({ _lastCommittedContent: projectContent });

    // Persist immediately (without chatHistory -- chats go to IndexedDB).
    const projectData: ProjectData = {
      id,
      name: projectName,
      content: projectContent,
      voiceId: 'default',
      createdAt: now,
      updatedAt: now,
    };
    saveProject(projectData);
    setActiveProjectId(id);

    // Create a default chat session in IndexedDB.
    const chatStore = useChatStore.getState();
    chatStore.loadSessionsForProject(id);

    // Refresh the in-memory project list.
    get().loadProjectList();

    return id;
  },

  openProject: async (id: string) => {
    const data = loadProject(id);
    if (!data) return false;

    // Reset all stores before loading.
    get().resetStores();

    // Set project metadata.
    set({
      activeProjectId: id,
      name: data.name,
      voiceId: data.voiceId,
    });

    // Populate the editor.
    const editorStore = useEditorStore.getState();
    editorStore.setContent(data.content);
    // Set the baseline for undo/redo diffing.
    useEditorStore.setState({ _lastCommittedContent: data.content });

    // Load timeline entries for this project.
    useTimelineStore.getState().loadForProject(id);

    // Load comments for this project.
    useCommentStore.getState().loadForProject(id);

    // Load story bible for this project.
    useStoryBibleStore.getState().loadForProject(id);

    // Mark as active.
    setActiveProjectId(id);

    // Check for legacy chatHistory that needs migration.
    const chatStore = useChatStore.getState();
    if (data.chatHistory && data.chatHistory.length > 0) {
      // Check if IndexedDB sessions already exist
      const existingSessions = await loadChatSessionsForProject(id);
      if (existingSessions.length === 0) {
        // Migrate legacy chatHistory to IndexedDB
        const now = Date.now();
        const session: ChatSession = {
          id: generateId(),
          projectId: id,
          name: 'Chat History',
          messages: data.chatHistory,
          parentChatId: null,
          parentMessageIndex: null,
          branchSummary: null,
          createdAt: now,
          updatedAt: now,
        };
        await saveChatSession(session);

        // Remove chatHistory from localStorage project data
        const updated: ProjectData = { ...data };
        delete updated.chatHistory;
        updated.updatedAt = Date.now();
        saveProject(updated);
      }
    }

    // Load chat sessions (will find migrated or existing sessions)
    await chatStore.loadSessionsForProject(id);

    return true;
  },

  saveCurrentProject: () => {
    const { activeProjectId, name, voiceId } = get();
    if (!activeProjectId) return;

    const { content } = useEditorStore.getState();

    // Try to load existing project to preserve createdAt.
    const existing = loadProject(activeProjectId);
    const now = Date.now();

    // No chatHistory -- chats are persisted in IndexedDB
    const projectData: ProjectData = {
      id: activeProjectId,
      name,
      content,
      voiceId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    saveProject(projectData);

    // Persist chat session to IndexedDB
    useChatStore.getState().persistCurrentSession();

    // Persist timeline entries.
    useTimelineStore.getState().persist();

    // Persist comments.
    useCommentStore.getState().persist();

    // Persist story bible.
    useStoryBibleStore.getState().persist();

    // Refresh the in-memory project list.
    get().loadProjectList();
  },

  renameProject: (id: string, newName: string) => {
    const data = loadProject(id);
    if (!data) return;

    data.name = newName;
    data.updatedAt = Date.now();
    saveProject(data);

    // If this is the active project, update in-memory name too.
    if (get().activeProjectId === id) {
      set({ name: newName });
    }

    get().loadProjectList();
  },

  removeProject: async (id: string) => {
    deleteProjectFromStorage(id);

    // Clean up IndexedDB chat sessions for this project.
    await deleteSessionsForProject(id);

    // Clean up timeline entries.
    useTimelineStore.getState().deleteForProject(id);

    // Clean up comments.
    useCommentStore.getState().deleteForProject(id);

    // Clean up story bible.
    useStoryBibleStore.getState().deleteForProject(id);

    // If we deleted the active project, clear active state.
    if (get().activeProjectId === id) {
      set({ activeProjectId: null });
      get().resetStores();
    }

    get().loadProjectList();
  },

  duplicateProject: (id: string) => {
    const data = loadProject(id);
    if (!data) return null;

    const newId = generateId();
    const now = Date.now();

    const duplicate: ProjectData = {
      ...data,
      id: newId,
      name: `${data.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    // Remove legacy chatHistory from duplicate
    delete duplicate.chatHistory;
    saveProject(duplicate);

    get().loadProjectList();
    return newId;
  },

  resetStores: () => {
    // Reset editor store.
    const editorStore = useEditorStore.getState();
    editorStore.setContent('');

    // Reset chat store.
    const chatStore = useChatStore.getState();
    chatStore.clearMessages();

    // Reset timeline store.
    const timelineStore = useTimelineStore.getState();
    timelineStore.clear();

    // Reset comment store.
    const commentStore = useCommentStore.getState();
    commentStore.clear();

    // Reset story bible store.
    const storyBibleStore = useStoryBibleStore.getState();
    storyBibleStore.clear();
  },
}));
