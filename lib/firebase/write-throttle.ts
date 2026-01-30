// ---------------------------------------------------------------------------
// Firestore Write Throttle -- Safety net for write bursts
// ---------------------------------------------------------------------------
//
// This module provides a lightweight safety net for Firestore writes.
// With the append-only timeline pattern, write pressure is significantly reduced.
// These settings are relaxed from the original aggressive throttling.
// ---------------------------------------------------------------------------

type WriteOperation = () => Promise<void>;

interface QueuedWrite {
  operation: WriteOperation;
  resolve: () => void;
  reject: (error: Error) => void;
}

// Allow moderate concurrency (Firestore can handle many more, but keep safety margin)
const MAX_CONCURRENT_WRITES = 5;

// Minimal delay between writes (just to prevent rapid fire)
const MIN_WRITE_INTERVAL_MS = 100;

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
 * Check if the write queue is backed up.
 * With relaxed settings, this should rarely trigger.
 */
export function isWriteQueueBusy(): boolean {
  return writeQueue.length > 10 || activeWrites >= MAX_CONCURRENT_WRITES;
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
