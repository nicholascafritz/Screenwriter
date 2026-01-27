'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface CommentFormProps {
  lineRange: string;
  initialContent?: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export default function CommentForm({
  lineRange,
  initialContent = '',
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="border border-border rounded-md p-2 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Line {lineRange}</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment..."
        className="min-h-[60px] max-h-[120px] resize-none text-xs"
        rows={2}
      />
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          Comment
        </Button>
      </div>
    </div>
  );
}
