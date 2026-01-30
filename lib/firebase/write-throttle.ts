// ---------------------------------------------------------------------------
// Firestore Write Throttle -- Prevents write queue exhaustion
// ---------------------------------------------------------------------------
//
// Firestore has a limit on the number of pending writes it can queue.
// During AI editing sessions, many rapid writes can exceed this limit.
// This module provides a global write queue that throttles concurrent writes.
// ---------------------------------------------------------------------------

type WriteOperation = () => Promise<void>;

interface QueuedWrite {
  operation: WriteOperation;
  resolve: () => void;
  reject: (error: Error) => void;
}

// Maximum concurrent Firestore writes (reduced to prevent queue exhaustion)
const MAX_CONCURRENT_WRITES = 1;

// Minimum delay between starting new writes (ms) - increased for safety
const MIN_WRITE_INTERVAL_MS = 500;

// Current state
let activeWrites = 0;
let lastWriteTime = 0;
const writeQueue: QueuedWrite[] = [];
let isProcessing = false;

/**
 * Queue a Firestore write operation with throttling.
 * Returns a promise that resolves when the write completes.
 */
export function queueWrite(operation: WriteOperation): Promise<void> {
  return new Promise((resolve, reject) => {
    writeQueue.push({ operation, resolve, reject });
    processQueue();
  });
}

/**
 * Process the write queue, respecting concurrency and rate limits.
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (writeQueue.length > 0) {
    // Wait if we're at max concurrent writes
    if (activeWrites >= MAX_CONCURRENT_WRITES) {
      await sleep(50);
      continue;
    }

    // Enforce minimum interval between writes
    const timeSinceLastWrite = Date.now() - lastWriteTime;
    if (timeSinceLastWrite < MIN_WRITE_INTERVAL_MS) {
      await sleep(MIN_WRITE_INTERVAL_MS - timeSinceLastWrite);
    }

    const item = writeQueue.shift();
    if (!item) break;

    activeWrites++;
    lastWriteTime = Date.now();

    // Execute the write operation
    item.operation()
      .then(() => {
        activeWrites--;
        item.resolve();
      })
      .catch((error) => {
        activeWrites--;
        // On resource exhausted, wait longer before re-queuing
        if (error?.code === 'resource-exhausted') {
          console.warn('[Firestore] Write throttled, waiting before retry...');
          // Longer backoff: 3-6 seconds
          setTimeout(() => {
            writeQueue.unshift(item); // Add to front of queue (priority)
            processQueue();
          }, 3000 + Math.random() * 3000);
        } else {
          item.reject(error);
        }
      });
  }

  isProcessing = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the write queue is backed up (useful for deciding to skip writes).
 * More aggressive threshold to prevent queue buildup.
 */
export function isWriteQueueBusy(): boolean {
  return writeQueue.length > 2 || activeWrites >= MAX_CONCURRENT_WRITES;
}

/**
 * Get current queue stats for debugging.
 */
export function getWriteQueueStats(): { queued: number; active: number } {
  return {
    queued: writeQueue.length,
    active: activeWrites,
  };
}
