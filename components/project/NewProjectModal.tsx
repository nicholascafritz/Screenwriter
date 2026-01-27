'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X, Plus } from 'lucide-react';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, content?: string) => void;
}

const GENRE_OPTIONS = [
  { value: 'action', label: 'Action' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'drama', label: 'Drama' },
  { value: 'horror', label: 'Horror' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'romance', label: 'Romance' },
  { value: 'documentary', label: 'Documentary' },
];

export default function NewProjectModal({ open, onClose, onCreate }: NewProjectModalProps) {
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [notes, setNotes] = useState('');
  const [genre, setGenre] = useState('');
  const [targetLength, setTargetLength] = useState(110);

  const handleCreate = useCallback(() => {
    const name = title.trim() || 'Untitled Screenplay';
    // Build initial Fountain content from the form fields
    const parts: string[] = [];
    parts.push(`Title: ${name}`);
    if (genre) parts.push(`Genre: ${genre}`);
    parts.push(`Draft date: ${new Date().toLocaleDateString()}`);
    parts.push('');
    if (logline) {
      parts.push(`= ${logline}`);
      parts.push('');
    }
    if (notes) {
      parts.push(`[[${notes}]]`);
      parts.push('');
    }

    onCreate(name, parts.join('\n'));
    // Reset form
    setTitle('');
    setLogline('');
    setNotes('');
    setGenre('');
    setTargetLength(110);
    onClose();
  }, [title, logline, notes, genre, targetLength, onCreate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-ds-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold text-foreground">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5 px-6 pb-6">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Project Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="THE HEIST"
              autoFocus
            />
          </div>

          {/* Logline */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Logline</label>
            <Textarea
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="A brief summary of the plot..."
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Find That line factor in life, not in making it to add in"
              rows={2}
            />
          </div>

          {/* Genre + Target Length row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Genre</label>
              <Select
                options={GENRE_OPTIONS}
                placeholder="Select Genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Slider
                label="Target Length"
                value={targetLength}
                onChange={setTargetLength}
                min={30}
                max={180}
                step={5}
              />
              <span className="text-xs text-muted-foreground text-right">{targetLength} pages</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-black/10">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleCreate} className="gap-1.5">
            Create Project
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
