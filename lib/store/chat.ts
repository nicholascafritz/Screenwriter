// ---------------------------------------------------------------------------
// Chat Store -- Zustand state management for the AI chat panel
// ---------------------------------------------------------------------------
//
// Supports multi-session chat with IndexedDB persistence and branching.
// Trust level system provides a unified mental model for AI autonomy.
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
import type { CompactionResult } from '@/lib/context/chat-compaction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The AI interaction mode currently in use. */
export type AIMode = 'inline' | 'diff' | 'agent' | 'writers-room';

// ---------------------------------------------------------------------------
// Trust Level System
// ---------------------------------------------------------------------------

/**
 * Trust levels represent user's current AI autonomy preference.
 * Maps to internal modes but presents a single mental model to users.
 */
export type TrustLevel = 0 | 1 | 2 | 3;

export interface TrustLevelConfig {
  label: string;
  mode: AIMode;
  description: string;
  shortDescription: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
}

export const TRUST_LEVEL_CONFIG: Record<TrustLevel, TrustLevelConfig> = {
  0: {
    label: 'Brainstorm',
    mode: 'writers-room',
    description: 'Ideas and feedback only — no changes to your script',
    shortDescription: 'Read-only',
    icon: 'Lightbulb',
    color: 'text-green-400',
  },
  1: {
    label: 'Review',
    mode: 'diff',
    description: 'Proposed changes shown for your approval before applying',
    shortDescription: 'Show diff',
    icon: 'GitCompare',
    color: 'text-blue-400',
  },
  2: {
    label: 'Edit',
    mode: 'inline',
    description: 'Changes applied immediately with undo available',
    shortDescription: 'Direct edit',
    icon: 'Pencil',
    color: 'text-amber-400',
  },
  3: {
    label: 'Auto',
    mode: 'agent',
    description: 'Plans and executes multi-step tasks autonomously',
    shortDescription: 'Autonomous',
    icon: 'Bot',
    color: 'text-purple-400',
  },
};

/**
 * Get the internal AI mode for a given trust level.
 */
export function trustLevelToMode(level: TrustLevel): AIMode {
  return TRUST_LEVEL_CONFIG[level].mode;
}

/**
 * Get the trust level for a given internal mode.
 */
export function modeToTrustLevel(mode: AIMode): TrustLevel {
  const entry = Object.entries(TRUST_LEVEL_CONFIG).find(
    ([_, config]) => config.mode === mode
  );
  return (entry ? Number(entry[0]) : 2) as TrustLevel;
}

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
    /** Structured data for rich UI rendering (e.g., dialogue analysis). */
    structuredData?: unknown;
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

  /** Trust level is the user-facing state (0-3). */
  trustLevel: TrustLevel;

  /** The currently active AI mode (derived from trustLevel for backwards compatibility). */
  mode: AIMode;

  /** Whether the AI is currently streaming a response. */
  isStreaming: boolean;

  /** ID of the active chat session. */
  activeChatId: string | null;

  /** Summaries of all chat sessions for the active project. */
  chatSessions: ChatSessionSummary[];

  /** ID of the active project (tracked for session management). */
  activeProjectId: string | null;

  /** Compacted summary of earlier conversation (preserves decisions/directions/constraints). */
  compactionResult: CompactionResult | null;

  /** Whether context compaction is currently in progress. */
  isCompacting: boolean;

  // -- Actions --------------------------------------------------------------

  /** Add a new message to the conversation. ID and timestamp are auto-generated. */
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;

  /** Update the content of the last message (used during streaming). */
  updateLastMessage: (content: string) => void;

  /**
   * Set the trust level. This is the primary way users control AI behavior.
   * Internally updates the mode for backwards compatibility.
   */
  setTrustLevel: (level: TrustLevel) => void;

  /**
   * @deprecated Use setTrustLevel instead. Kept for internal compatibility.
   */
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

  /** Compact the conversation history by summarizing old messages. */
  compactHistory: () => Promise<void>;

  /** Auto-generate a title for the current session if it's still "New Chat". */
  autoTitleSession: () => Promise<void>;

  /**
   * Get formatted chat history for context, including compacted portion.
   */
  getFormattedChatHistory: () => string;

  /**
   * Start a fresh context while preserving screenplay state.
   * Clears chat history but keeps compacted decisions.
   */
  startFreshContext: () => void;

  /**
   * Check if compaction is recommended based on message count and token usage.
   */
  shouldCompactNow: () => boolean;
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
  trustLevel: 2, // Default to Edit (inline)
  mode: 'inline',
  isStreaming: false,
  isCompacting: false,
  activeChatId: null,
  chatSessions: [],
  activeProjectId: null,
  compactionResult: null,

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

  setTrustLevel: (level: TrustLevel) => {
    const config = TRUST_LEVEL_CONFIG[level];
    set({
      trustLevel: level,
      mode: config.mode,
    });

    // Also persist to project store for per-project preference
    const projectId = useProjectStore.getState().activeProjectId;
    if (projectId) {
      useProjectStore.getState().updateProjectTrustLevel?.(projectId, level);
    }
  },

  // Deprecated but maintained for backward compatibility
  setMode: (mode: AIMode) => {
    const level = modeToTrustLevel(mode);
    get().setTrustLevel(level);
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
    const { messages, compactionResult } = get();
    if (messages.length <= 8) return; // Not enough to compact.

    set({ isCompacting: true });

    try {
      // Use the new enhanced compaction system
      const { compactChatHistory, mergeCompactionResults } = await import(
        '@/lib/context/chat-compaction'
      );

      // Convert messages to compaction format
      const chatMessages = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        toolCalls: m.toolCalls?.map((tc) => ({ name: tc.name, result: tc.result })),
      }));

      // Compact, keeping last 4 messages
      const result = await compactChatHistory(chatMessages, 4);

      // Merge with existing compaction if any
      const mergedCompaction = compactionResult
        ? mergeCompactionResults(compactionResult, result.compactedSummary)
        : result.compactedSummary;

      // Update store with compacted state
      const keptMessages: ChatMessage[] = result.recentMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        mode: get().mode,
        toolCalls: m.toolCalls?.map((tc) => ({
          name: tc.name,
          input: {},
          result: tc.result,
        })),
      }));

      set({
        messages: keptMessages,
        compactionResult: mergedCompaction,
        isCompacting: false,
      });

      debouncedPersist();
    } catch (error) {
      console.error('Compaction failed:', error);
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

  getFormattedChatHistory: () => {
    const { messages, compactionResult } = get();

    const parts: string[] = [];

    // Include compacted summary if exists
    if (compactionResult && compactionResult.messagesCompacted > 0) {
      parts.push(`## Earlier Conversation (${compactionResult.messagesCompacted} messages summarized)`);
      parts.push('');

      if (compactionResult.summary) {
        parts.push(compactionResult.summary);
        parts.push('');
      }

      if (compactionResult.decisions.length > 0) {
        parts.push('**Decisions made:**');
        for (const d of compactionResult.decisions) {
          parts.push(`- ${d}`);
        }
        parts.push('');
      }

      if (compactionResult.directions.length > 0) {
        parts.push('**Creative directions:**');
        for (const d of compactionResult.directions) {
          parts.push(`- ${d}`);
        }
        parts.push('');
      }

      if (compactionResult.constraints.length > 0) {
        parts.push('**Constraints established:**');
        for (const c of compactionResult.constraints) {
          parts.push(`- ${c}`);
        }
        parts.push('');
      }
    }

    // Include recent messages
    if (messages.length > 0) {
      parts.push('## Recent Conversation');
      parts.push('');

      for (const msg of messages) {
        if (msg.role === 'system') continue; // Skip system messages

        const role = msg.role === 'user' ? 'Writer' : 'Assistant';
        parts.push(`**${role}:** ${msg.content}`);
        parts.push('');
      }
    }

    return parts.join('\n');
  },

  startFreshContext: () => {
    const { compactionResult, mode } = get();

    // Keep compaction decisions but clear messages
    set({
      messages: [
        {
          id: nextMessageId(),
          role: 'system',
          content: 'Context refreshed. Screenplay state and earlier decisions are preserved.',
          timestamp: Date.now(),
          mode,
        },
      ],
      // Keep compaction result so decisions persist
      compactionResult: compactionResult,
    });

    debouncedPersist();
  },

  shouldCompactNow: () => {
    const { messages } = get();
    const estimatedTokens = messages.reduce(
      (sum, m) => sum + Math.ceil(m.content.length / 4),
      0
    );
    return messages.length > 10 || estimatedTokens > 15000;
  },
}));
