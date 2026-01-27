// ---------------------------------------------------------------------------
// Store Types -- Shared type definitions for project persistence
// ---------------------------------------------------------------------------

import type { AIMode } from './chat';

// ---------------------------------------------------------------------------
// Supported upload file types
// ---------------------------------------------------------------------------

/** File types accepted for script import. */
export type UploadFileType = 'fountain' | 'txt' | 'fdx';

// ---------------------------------------------------------------------------
// Serialised chat message (for localStorage persistence)
// ---------------------------------------------------------------------------

/**
 * A stripped-down chat message safe for JSON serialisation.
 * Streaming state and tool call details are omitted — only the final
 * text content is persisted.
 */
export interface SerializedChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: AIMode;
}

// ---------------------------------------------------------------------------
// Project data (single project in localStorage)
// ---------------------------------------------------------------------------

/**
 * The full saved state of a single project.
 * Raw Fountain text + serialised chat history.  The parsed AST is never
 * persisted — it is derived on load via `parseFountain()`.
 */
export interface ProjectData {
  /** Unique identifier for the project. */
  id: string;

  /** Display name (defaults to the title-page Title or "Untitled Screenplay"). */
  name: string;

  /** Raw Fountain source text. */
  content: string;

  /** ID of the active voice profile. */
  voiceId: string;

  /** @deprecated Chats now stored in IndexedDB. Retained for migration. */
  chatHistory?: SerializedChatMessage[];

  /** Unix timestamp (ms) when the project was created. */
  createdAt: number;

  /** Unix timestamp (ms) of the last save. */
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Project summary (for the home-page grid — lightweight, no content)
// ---------------------------------------------------------------------------

/**
 * Lightweight summary used to render project cards on the home page
 * without loading full screenplay content into memory.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  /** Approximate page count (stored at save time for quick display). */
  pageCount: number;
  /** Number of scenes (stored at save time for quick display). */
  sceneCount: number;
}
