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
} from '@/lib/firebase/firestore-persistence';
import { deleteSessionsForProject } from '@/lib/firebase/firestore-chat-persistence';
import { deleteTimelineEntries } from '@/lib/firebase/firestore-changelog-persistence';
import { deleteCommentsForProject } from '@/lib/firebase/firestore-comment-persistence';
import { deleteStoryBible } from '@/lib/firebase/firestore-story-bible-persistence';
import { deleteOutline } from '@/lib/firebase/firestore-outline-persistence';
import { useEditorStore } from './editor';
import { useChatStore } from './chat';
import { useTimelineStore } from './timeline';
import { useCommentStore } from './comments';
import { useStoryBibleStore } from './story-bible';
import { useOutlineStore } from './outline';

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

  /** The authenticated user's ID (set by auth context). */
  userId: string | null;

  // -- Actions --------------------------------------------------------------

  /** Update the project name. */
  setName: (name: string) => void;

  /** Update the active voice profile. */
  setVoiceId: (id: string) => void;

  /** Set the authenticated user ID. */
  setUserId: (id: string | null) => void;

  /** Refresh the project list from Firestore. */
  loadProjectList: () => Promise<void>;

  /**
   * Create a new project with optional initial content.
   * Sets it as the active project and populates the editor.
   * Returns the new project ID.
   */
  createProject: (name?: string, content?: string) => Promise<string>;

  /**
   * Open an existing project by ID.
   * Loads from Firestore and loads related data (chat, timeline, etc.).
   * Returns `true` if the project was found and loaded.
   */
  openProject: (id: string) => Promise<boolean>;

  /**
   * Save the current project state to Firestore.
   * Chat messages are persisted separately.
   */
  saveCurrentProject: () => Promise<void>;

  /** Rename a project (updates Firestore and in-memory list). */
  renameProject: (id: string, newName: string) => Promise<void>;

  /** Delete a project and clear active state if it was the current one. */
  removeProject: (id: string) => Promise<void>;

  /**
   * Duplicate a project.  Creates a copy with a new ID and "(Copy)" suffix.
   * Returns the new project ID.
   */
  duplicateProject: (id: string) => Promise<string | null>;

  /** Reset all stores (editor, chat, timeline) to their initial states. */
  resetStores: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVE_PROJECT_KEY = 'screenwriter:activeProjectId';

/** Persist the active project ID to localStorage for session restoration. */
function persistActiveProjectId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  } catch {
    // localStorage may be unavailable (SSR, private browsing).
  }
}

/** Read the previously active project ID from localStorage. */
export function getPersistedActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

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
  userId: null,

  // -- Actions --------------------------------------------------------------

  setName: (name: string) => {
    set({ name });
  },

  setVoiceId: (id: string) => {
    set({ voiceId: id });
  },

  setUserId: (id: string | null) => {
    set({ userId: id });
    if (!id) {
      get().resetStores();
      set({ activeProjectId: null, projects: [] });
      persistActiveProjectId(null);
    }
  },

  loadProjectList: async () => {
    const { userId } = get();
    if (!userId) return;
    const projects = await loadProjectIndex(userId);
    // Already sorted by updatedAt desc from Firestore query.
    set({ projects });
  },

  createProject: async (name?: string, content?: string) => {
    const { userId } = get();
    if (!userId) throw new Error('No authenticated user');

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
    persistActiveProjectId(id);

    // Populate the editor.
    const editorStore = useEditorStore.getState();
    editorStore.setContent(projectContent);
    // Set the baseline for undo/redo diffing.
    useEditorStore.setState({ _lastCommittedContent: projectContent });

    // Persist to Firestore.
    const projectData: ProjectData = {
      id,
      name: projectName,
      content: projectContent,
      voiceId: 'default',
      createdAt: now,
      updatedAt: now,
    };
    await saveProject(userId, projectData);

    // Create a default chat session.
    const chatStore = useChatStore.getState();
    await chatStore.loadSessionsForProject(id);

    // Refresh the in-memory project list.
    await get().loadProjectList();

    return id;
  },

  openProject: async (id: string) => {
    const { userId } = get();
    if (!userId) return false;

    const data = await loadProject(userId, id);
    if (!data) return false;

    // Reset all stores before loading.
    get().resetStores();

    // Set project metadata.
    set({
      activeProjectId: id,
      name: data.name,
      voiceId: data.voiceId,
    });
    persistActiveProjectId(id);

    // Populate the editor.
    const editorStore = useEditorStore.getState();
    editorStore.setContent(data.content);
    // Set the baseline for undo/redo diffing.
    useEditorStore.setState({ _lastCommittedContent: data.content });

    // Load timeline entries for this project.
    await useTimelineStore.getState().loadForProject(id);

    // Load comments for this project.
    await useCommentStore.getState().loadForProject(id);

    // Load story bible for this project.
    await useStoryBibleStore.getState().loadForProject(id);

    // Load the structural outline for this project.
    await useOutlineStore.getState().loadForProject(id);

    // Load chat sessions.
    const chatStore = useChatStore.getState();
    await chatStore.loadSessionsForProject(id);

    return true;
  },

  saveCurrentProject: async () => {
    const { activeProjectId, name, voiceId, userId } = get();
    if (!activeProjectId || !userId) return;

    const { content } = useEditorStore.getState();

    // Try to load existing project to preserve createdAt.
    const existing = await loadProject(userId, activeProjectId);
    const now = Date.now();

    const projectData: ProjectData = {
      id: activeProjectId,
      name,
      content,
      voiceId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveProject(userId, projectData);

    // Persist chat session.
    useChatStore.getState().persistCurrentSession();

    // Persist timeline entries.
    useTimelineStore.getState().persist();

    // Persist comments.
    useCommentStore.getState().persist();

    // Persist story bible.
    useStoryBibleStore.getState().persist();

    // Persist structural outline.
    useOutlineStore.getState().persist();

    // Refresh the in-memory project list.
    await get().loadProjectList();
  },

  renameProject: async (id: string, newName: string) => {
    const { userId } = get();
    if (!userId) return;

    const data = await loadProject(userId, id);
    if (!data) return;

    data.name = newName;
    data.updatedAt = Date.now();
    await saveProject(userId, data);

    // If this is the active project, update in-memory name too.
    if (get().activeProjectId === id) {
      set({ name: newName });
    }

    await get().loadProjectList();
  },

  removeProject: async (id: string) => {
    const { userId } = get();
    if (!userId) return;

    await deleteProjectFromStorage(userId, id);

    // Clean up subcollections.
    await deleteSessionsForProject(userId, id);
    await deleteTimelineEntries(userId, id);
    await deleteCommentsForProject(userId, id);
    await deleteStoryBible(userId, id);
    await deleteOutline(userId, id);

    // If we deleted the active project, clear active state.
    if (get().activeProjectId === id) {
      set({ activeProjectId: null });
      persistActiveProjectId(null);
      get().resetStores();
    }

    await get().loadProjectList();
  },

  duplicateProject: async (id: string) => {
    const { userId } = get();
    if (!userId) return null;

    const data = await loadProject(userId, id);
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
    delete duplicate.chatHistory;
    await saveProject(userId, duplicate);

    await get().loadProjectList();
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

    // Reset outline store.
    const outlineStore = useOutlineStore.getState();
    outlineStore.clear();
  },
}));
