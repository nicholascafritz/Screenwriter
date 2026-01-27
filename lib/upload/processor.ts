// ---------------------------------------------------------------------------
// File Upload Processor -- routes uploaded files to the correct handler
// ---------------------------------------------------------------------------

import type { UploadFileType } from '@/lib/store/types';
import { fdxToFountain } from './fdx-parser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessedFile {
  /** Derived project name (filename without extension). */
  name: string;
  /** Fountain-formatted content. */
  content: string;
  /** The detected file type. */
  type: UploadFileType;
}

// ---------------------------------------------------------------------------
// Accepted extensions
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS: Record<string, UploadFileType> = {
  '.fountain': 'fountain',
  '.txt': 'txt',
  '.fdx': 'fdx',
};

/** MIME / extension filter for the file picker's `accept` attribute. */
export const ACCEPTED_FILE_TYPES = '.fountain,.txt,.fdx';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine the upload file type from a filename.
 * Returns `null` if the extension is not supported.
 */
export function detectFileType(filename: string): UploadFileType | null {
  const lower = filename.toLowerCase();
  for (const [ext, type] of Object.entries(ACCEPTED_EXTENSIONS)) {
    if (lower.endsWith(ext)) return type;
  }
  return null;
}

/**
 * Process a single `File` object into Fountain content.
 *
 * - `.fountain` and `.txt` files are read as-is (UTF-8 text).
 * - `.fdx` files are parsed and converted to Fountain format.
 *
 * Throws if the file type is unsupported or reading fails.
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  const type = detectFileType(file.name);
  if (!type) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  const name = file.name.replace(/\.[^.]+$/, '') || 'Untitled';
  const rawText = await file.text();

  let content: string;

  switch (type) {
    case 'fountain':
    case 'txt':
      content = rawText;
      break;
    case 'fdx':
      content = fdxToFountain(rawText);
      break;
    default:
      throw new Error(`Unsupported file type: ${type}`);
  }

  return { name, content, type };
}

/**
 * Process multiple files. Invalid files are silently skipped.
 * Returns an array of successfully processed files.
 */
export async function processFiles(files: FileList | File[]): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const type = detectFileType(file.name);
    if (!type) continue;
    try {
      const processed = await processFile(file);
      results.push(processed);
    } catch {
      // Skip files that fail processing.
    }
  }

  return results;
}
