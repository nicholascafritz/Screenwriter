// ---------------------------------------------------------------------------
// Guide Chat Store -- Zustand store for AI Story Guide conversation state
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { useProjectStore } from './project';
import {
  GuideSession,
  GuideMessage,
  loadGuideSessions,
  loadGuideSession,
  saveGuideSession,
} from '@/lib/firebase/firestore-guide-persistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuideContext {
  projectTitle?: string;
  genre?: string;
  logline?: string;
  notes?: string;
}

interface GuideChatState {
  /** All guide sessions for the current project */
  sessions: GuideSession[];
  /** ID of the currently active session (null if no session yet) */
  activeSessionId: string | null;
  /** Messages in the active session */
  messages: GuideMessage[];
  /** Whether sessions are currently loading */
  isLoading: boolean;
  /** Whether the guide has been started (user clicked Start) */
  hasStarted: boolean;
  /** Context from project creation form */
  guideContext: GuideContext;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Load all guide sessions for a project */
  loadSessionsForProject: (userId: string, projectId: string) => Promise<void>;

  /** Load a specific session */
  loadSession: (userId: string, projectId: string, sessionId: string) => Promise<void>;

  /** Add a message to the current session */
  addMessage: (message: Omit<GuideMessage, 'id' | 'timestamp'>) => void;

  /** Update the last message content (for streaming) */
  updateLastMessage: (content: string) => void;

  /** Persist the current session to Firestore */
  persistCurrentSession: () => Promise<void>;

  /** Start a new guide session */
  startNewSession: () => void;

  /** Mark the guide as started */
  setHasStarted: (started: boolean) => void;

  /** Set the guide context */
  setGuideContext: (context: GuideContext) => void;

  /** Reset all guide state (for when switching projects) */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Get the authenticated user ID from the project store. */
function getUserId(): string | null {
  return useProjectStore.getState().userId;
}

/** Generate a unique message ID. */
function generateMessageId(): string {
  return `guide-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Generate a unique session ID. */
function generateSessionId(): string {
  return `guide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Debounced persist timer
// ---------------------------------------------------------------------------

let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedPersist() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    useGuideChatStore.getState().persistCurrentSession();
    _persistTimer = null;
  }, 500);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGuideChatStore = create<GuideChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isLoading: false,
  hasStarted: false,
  guideContext: {},

  // ---------------------------------------------------------------------------
  // Load sessions for project
  // ---------------------------------------------------------------------------

  loadSessionsForProject: async (userId, projectId) => {
    set({ isLoading: true });

    try {
      const sessions = await loadGuideSessions(userId, projectId);

      // If there are existing sessions, load the most recent one
      if (sessions.length > 0) {
        const latest = sessions[0];
        set({
          sessions,
          activeSessionId: latest.id,
          messages: latest.messages,
          hasStarted: latest.messages.length > 0,
          guideContext: latest.guideContext ?? {},
          isLoading: false,
        });
      } else {
        // No sessions yet - start fresh
        set({
          sessions: [],
          activeSessionId: null,
          messages: [],
          hasStarted: false,
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // ---------------------------------------------------------------------------
  // Load specific session
  // ---------------------------------------------------------------------------

  loadSession: async (userId, projectId, sessionId) => {
    const session = await loadGuideSession(userId, projectId, sessionId);
    if (session) {
      set({
        activeSessionId: session.id,
        messages: session.messages,
        hasStarted: session.messages.length > 0,
        guideContext: session.guideContext ?? {},
      });
    }
  },

  // ---------------------------------------------------------------------------
  // Add message
  // ---------------------------------------------------------------------------

  addMessage: (message) => {
    const newMessage: GuideMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));

    // Trigger debounced persistence
    debouncedPersist();
  },

  // ---------------------------------------------------------------------------
  // Update last message (for streaming)
  // ---------------------------------------------------------------------------

  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    });

    // Don't persist during streaming - will persist when complete
  },

  // ---------------------------------------------------------------------------
  // Persist current session
  // ---------------------------------------------------------------------------

  persistCurrentSession: async () => {
    const { activeSessionId, messages, sessions, guideContext } = get();
    const projectId = useProjectStore.getState().activeProjectId;
    const userId = getUserId();

    if (!projectId || !userId) return;
    if (messages.length === 0) return; // Don't persist empty sessions

    const sessionId = activeSessionId || generateSessionId();
    const existingSession = sessions.find((s) => s.id === sessionId);

    const session: GuideSession = {
      id: sessionId,
      projectId,
      messages,
      guideContext,
      createdAt: existingSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    await saveGuideSession(userId, projectId, session);

    // Update local state if this was a new session
    if (!activeSessionId) {
      set((state) => ({
        activeSessionId: sessionId,
        sessions: [session, ...state.sessions],
      }));
    } else {
      // Update the session in the list
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? session : s
        ),
      }));
    }
  },

  // ---------------------------------------------------------------------------
  // Start new session
  // ---------------------------------------------------------------------------

  startNewSession: () => {
    set({
      activeSessionId: null,
      messages: [],
      hasStarted: false,
    });
  },

  // ---------------------------------------------------------------------------
  // Set has started
  // ---------------------------------------------------------------------------

  setHasStarted: (started) => {
    set({ hasStarted: started });
  },

  // ---------------------------------------------------------------------------
  // Set guide context
  // ---------------------------------------------------------------------------

  setGuideContext: (context) => {
    set({ guideContext: context });
  },

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset: () => {
    set({
      sessions: [],
      activeSessionId: null,
      messages: [],
      isLoading: false,
      hasStarted: false,
      guideContext: {},
    });
  },
}));
