'use client';

import { useState, useCallback, useRef } from 'react';
import type { ReactNode, DragEvent } from 'react';
import { detectFileType } from '@/lib/upload/processor';
import { Upload } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileDropZoneProps {
  /** Called with valid dropped files. */
  onFiles: (files: File[]) => void;
  /** Wrap child content — the drop zone covers this area. */
  children: ReactNode;
  /** Additional CSS classes for the wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FileDropZone({ onFiles, children, className }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        detectFileType(f.name) !== null
      );
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles]
  );

  return (
    <div
      className={`relative ${className ?? ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg">
          <div className="flex flex-col items-center gap-3 text-primary">
            <Upload className="h-10 w-10" />
            <p className="text-lg font-medium">Drop screenplay files here</p>
            <p className="text-sm text-muted-foreground">
              .fountain, .fdx, or .txt files
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
