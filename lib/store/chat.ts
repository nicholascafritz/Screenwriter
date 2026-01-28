// ---------------------------------------------------------------------------
// Chat Store -- Zustand state management for the AI chat panel
// ---------------------------------------------------------------------------
//
// Supports multi-session chat with IndexedDB persistence and branching.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type { SerializedChatMessage } from './types';
import type { ChatSessionSummary } from '@/lib/firebase/firestore-chat-persistence';
import {
  loadSessionSummaries,
  loadSession,
  saveSession,
  deleteSessionById,
  type ChatSession,
} from '@/lib/firebase/firestore-chat-persistence';
import { useProjectStore } from './project';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The AI interaction mode currently in use. */
export type AIMode = 'inline' | 'diff' | 'agent' | 'writers-room';

/**
 * A single message in the chat conversation.
 */
export interface ChatMessage {
  /** Unique identifier for this message. */
  id: string;

  /** Who sent the message. */
  role: 'user' | 'assistant' | 'system';

  /** The text content of the message. */
  content: string;

  /** Unix timestamp (milliseconds) when the message was created. */
  timestamp: number;

  /** The AI mode that was active when this message was sent. */
  mode: AIMode;

  /** Tool calls made by the assistant during this message, if any. */
  toolCalls?: {
    name: string;
    input: Record<string, unknown>;
    result?: string;
  }[];

  /** Whether the message is still being streamed from the AI. */
  isStreaming?: boolean;
}

/**
 * Chat store state and actions.
 */
export interface ChatState {
  /** All messages in the current conversation. */
  messages: ChatMessage[];

  /** The currently active AI mode. */
  mode: AIMode;

  /** Whether the AI is currently streaming a response. */
  isStreaming: boolean;

  /** ID of the active chat session. */
  activeChatId: string | null;

  /** Summaries of all chat sessions for the active project. */
  chatSessions: ChatSessionSummary[];

  /** ID of the active project (tracked for session management). */
  activeProjectId: string | null;

  // -- Actions --------------------------------------------------------------

  /** Add a new message to the conversation. ID and timestamp are auto-generated. */
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  /** Update the content of the last message (used during streaming). */
  updateLastMessage: (content: string) => void;

  /** Switch the AI interaction mode. */
  setMode: (mode: AIMode) => void;

  /** Set the streaming state. */
  setStreaming: (streaming: boolean) => void;

  /** Clear all messages from the conversation. */
  clearMessages: () => void;

  /** Load all sessions for a project. Creates a default session if none exist. */
  loadSessionsForProject: (projectId: string) => Promise<void>;

  /** Create a new chat session. Returns the new session ID. */
  createSession: (
    projectId: string,
    name?: string,
    initialMessages?: SerializedChatMessage[],
    parentChatId?: string | null,
    parentMessageIndex?: number | null,
    branchSummary?: string | null,
  ) => Promise<string>;

  /** Switch to a different chat session. Persists current session first. */
  switchSession: (sessionId: string) => Promise<void>;

  /** Rename a chat session. */
  renameSession: (sessionId: string, name: string) => Promise<void>;

  /** Delete a chat session. Switches to another if deleting the active one. */
  deleteSession: (sessionId: string) => Promise<void>;

  /** Persist the current session's messages to IndexedDB. */
  persistCurrentSession: () => Promise<void>;

  /** Branch from a specific message index, creating a new session with AI summary. */
  branchSession: (atMessageIndex: number) => Promise<void>;

  /** Whether context compaction is currently in progress. */
  isCompacting: boolean;

  /** Compact the conversation history by summarizing old messages. */
  compactHistory: () => Promise<void>;

  /** Auto-generate a title for the current session if it's still "New Chat". */
  autoTitleSession: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _messageIdCounter = 0;

function nextMessageId(): string {
  _messageIdCounter += 1;
  return `msg-${_messageIdCounter}`;
}

/** Get the authenticated user ID from the project store. */
function getUserId(): string | null {
  return useProjectStore.getState().userId;
}

/** Serialize messages for Firestore storage (filter streaming). */
function serializeMessages(messages: ChatMessage[]): SerializedChatMessage[] {
  return messages
    .filter((m) => !m.isStreaming)
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      mode: m.mode,
    }));
}

// Debounced persist timer
let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedPersist() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    useChatStore.getState().persistCurrentSession();
    _persistTimer = null;
  }, 500);
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatState>((set, get) => ({
  // -- Initial state --------------------------------------------------------
  messages: [],
  mode: 'inline',
  isStreaming: false,
  isCompacting: false,
  activeChatId: null,
  chatSessions: [],
  activeProjectId: null,

  // -- Actions --------------------------------------------------------------

  addMessage: (message) => {
    const fullMessage: ChatMessage = {
      ...message,
      id: nextMessageId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, fullMessage],
    }));
    // Debounced persist after adding non-streaming messages
    if (!message.isStreaming) {
      debouncedPersist();
    }
  },

  updateLastMessage: (content: string) => {
    set((state) => {
      const messages = [...state.messages];
      if (messages.length === 0) return state;

      const last = { ...messages[messages.length - 1] };
      last.content = content;
      messages[messages.length - 1] = last;

      return { messages };
    });
  },

  setMode: (mode: AIMode) => {
    set({ mode });
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming });

    // When streaming finishes, mark the last message as no longer streaming.
    if (!streaming) {
      set((state) => {
        const messages = [...state.messages];
        if (messages.length === 0) return state;

        const last = { ...messages[messages.length - 1] };
        last.isStreaming = false;
        messages[messages.length - 1] = last;

        return { messages };
      });
      // Persist once streaming completes
      debouncedPersist();
    }
  },

  clearMessages: () => {
    set({ messages: [] });
    debouncedPersist();
  },

  // -- Multi-session actions ------------------------------------------------

  loadSessionsForProject: async (projectId: string) => {
    const userId = getUserId();
    if (!userId) return;

    set({ activeProjectId: projectId });

    const summaries = await loadSessionSummaries(userId, projectId);

    if (summaries.length === 0) {
      // Create a default session
      const sessionId = await get().createSession(projectId, 'New Chat');
      const newSummaries = await loadSessionSummaries(userId, projectId);
      set({ chatSessions: newSummaries, activeChatId: sessionId });
      return;
    }

    // Load the most recently updated session
    const sorted = [...summaries].sort((a, b) => b.updatedAt - a.updatedAt);
    const latestId = sorted[0].id;
    set({ chatSessions: summaries });

    // Load messages for the latest session
    const session = await loadSession(userId, projectId, latestId);
    if (session) {
      const restored: ChatMessage[] = session.messages.map((m) => ({
        ...m,
        id: m.id || nextMessageId(),
        timestamp: m.timestamp || Date.now(),
      }));
      set({ messages: restored, activeChatId: latestId });
    } else {
      set({ activeChatId: latestId });
    }
  },

  createSession: async (
    projectId: string,
    name = 'New Chat',
    initialMessages?: SerializedChatMessage[],
    parentChatId: string | null = null,
    parentMessageIndex: number | null = null,
    branchSummary: string | null = null,
  ) => {
    const userId = getUserId();
    if (!userId) throw new Error('No authenticated user');

    const id = generateId();
    const now = Date.now();

    const session: ChatSession = {
      id,
      projectId,
      name,
      messages: initialMessages ?? [],
      parentChatId,
      parentMessageIndex,
      branchSummary,
      createdAt: now,
      updatedAt: now,
    };

    await saveSession(userId, projectId, session);

    // Refresh summaries
    const summaries = await loadSessionSummaries(userId, projectId);
    set({ chatSessions: summaries });

    return id;
  },

  switchSession: async (sessionId: string) => {
    const userId = getUserId();
    if (!userId) return;

    const { activeChatId, activeProjectId } = get();

    // Persist current session before switching
    if (activeChatId && activeProjectId) {
      await get().persistCurrentSession();
    }

    if (!activeProjectId) return;

    // Load the target session
    const session = await loadSession(userId, activeProjectId, sessionId);
    if (!session) return;

    const restored: ChatMessage[] = session.messages.map((m) => ({
      ...m,
      id: m.id || nextMessageId(),
      timestamp: m.timestamp || Date.now(),
    }));

    set({ messages: restored, activeChatId: sessionId });
  },

  renameSession: async (sessionId: string, name: string) => {
    const userId = getUserId();
    if (!userId) return;

    const { activeProjectId } = get();
    if (!activeProjectId) return;

    const session = await loadSession(userId, activeProjectId, sessionId);
    if (!session) return;

    session.name = name;
    session.updatedAt = Date.now();
    await saveSession(userId, activeProjectId, session);

    // Refresh summaries
    const summaries = await loadSessionSummaries(userId, activeProjectId);
    set({ chatSessions: summaries });
  },

  deleteSession: async (sessionId: string) => {
    const userId = getUserId();
    if (!userId) return;

    const { activeChatId, activeProjectId } = get();
    if (!activeProjectId) return;

    await deleteSessionById(userId, activeProjectId, sessionId);

    const summaries = await loadSessionSummaries(userId, activeProjectId);
    set({ chatSessions: summaries });

    // If we deleted the active session, switch to another
    if (activeChatId === sessionId) {
      if (summaries.length > 0) {
        await get().switchSession(summaries[0].id);
      } else {
        // Create a new default session
        const newId = await get().createSession(activeProjectId, 'New Chat');
        set({ activeChatId: newId, messages: [] });
      }
    }
  },

  persistCurrentSession: async () => {
    const userId = getUserId();
    if (!userId) return;

    const { activeChatId, activeProjectId, messages } = get();
    if (!activeChatId || !activeProjectId) return;

    const session = await loadSession(userId, activeProjectId, activeChatId);
    if (!session) return;

    session.messages = serializeMessages(messages);
    session.updatedAt = Date.now();
    await saveSession(userId, activeProjectId, session);

    // Refresh summaries so message counts update
    const summaries = await loadSessionSummaries(userId, activeProjectId);
    set({ chatSessions: summaries });
  },

  branchSession: async (atMessageIndex: number) => {
    const { messages, activeChatId, activeProjectId, chatSessions } = get();
    if (!activeChatId || !activeProjectId) return;

    // Persist current session first
    await get().persistCurrentSession();

    // Slice messages up to and including the specified index
    const branchedMessages = messages.slice(0, atMessageIndex + 1);
    const serialized = serializeMessages(branchedMessages);

    // Get the parent session name
    const parentSession = chatSessions.find((s) => s.id === activeChatId);
    const parentName = parentSession?.name ?? 'Chat';

    // Summarize the branched messages
    let summary = '';
    try {
      const response = await fetch('/api/summarize-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: serialized.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        summary = data.summary ?? '';
      }
    } catch {
      summary = 'Branched from previous conversation.';
    }

    // Create the system message with summary
    const systemMessage: SerializedChatMessage = {
      id: nextMessageId(),
      role: 'system',
      content: `Context from previous conversation:\n\n${summary}`,
      timestamp: Date.now(),
      mode: 'inline',
    };

    // Create the new branch session
    const newId = await get().createSession(
      activeProjectId,
      `${parentName} (Branch)`,
      [systemMessage],
      activeChatId,
      atMessageIndex,
      summary,
    );

    // Switch to the new session
    await get().switchSession(newId);
  },

  compactHistory: async () => {
    const { messages } = get();
    if (messages.length <= 8) return; // Not enough to compact.

    set({ isCompacting: true });

    try {
      // Import dynamically to avoid circular deps.
      const { PRESERVE_RECENT } = await import('@/lib/chat/token-estimator');
      const { summarizeOldMessages, buildCompactedHistory } = await import('@/lib/chat/auto-compact');

      // Messages to summarize (everything except the preserved tail).
      const oldMessages = messages.slice(0, -PRESERVE_RECENT);
      const summary = await summarizeOldMessages(
        oldMessages.map((m) => ({ role: m.role, content: m.content })),
      );

      // Build compacted history.
      const compactedRaw = buildCompactedHistory(
        messages.map((m) => ({ role: m.role, content: m.content })),
        summary,
      );

      // Convert back to ChatMessage format.
      const compacted: ChatMessage[] = compactedRaw.map((m, i) => {
        if (i === 0) {
          // This is the summary system message.
          return {
            id: nextMessageId(),
            role: 'system' as const,
            content: m.content,
            timestamp: Date.now(),
            mode: get().mode,
          };
        }
        // Recent messages preserved from the original array.
        const recentIdx = messages.length - (compactedRaw.length - 1) + (i - 1);
        return messages[recentIdx];
      });

      set({ messages: compacted });
      debouncedPersist();
    } catch {
      // If compaction fails, continue with the existing messages.
    } finally {
      set({ isCompacting: false });
    }
  },

  autoTitleSession: async () => {
    const { activeChatId, activeProjectId, messages, chatSessions } = get();
    if (!activeChatId || !activeProjectId) return;

    // Only auto-title sessions that are still named "New Chat".
    const currentSession = chatSessions.find((s) => s.id === activeChatId);
    if (!currentSession || currentSession.name !== 'New Chat') return;

    // Need at least one user message and one assistant message.
    const userMsg = messages.find((m) => m.role === 'user');
    const assistantMsg = messages.find((m) => m.role === 'assistant' && m.content.trim());
    if (!userMsg || !assistantMsg) return;

    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMsg.content,
          assistantMessage: assistantMsg.content,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const title = data.title?.trim();
      if (!title) return;

      await get().renameSession(activeChatId, title);
    } catch {
      // Auto-titling is non-critical; fail silently.
    }
  },
}));
