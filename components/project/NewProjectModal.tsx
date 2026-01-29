'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X, Plus, Sparkles, PenLine } from 'lucide-react';
import type { ProjectMetadata } from '@/lib/store/project';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, content?: string, metadata?: ProjectMetadata) => Promise<void>;
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

type ModalStep = 'form' | 'choice';

export default function NewProjectModal({ open, onClose, onCreate }: NewProjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>('form');
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [notes, setNotes] = useState('');
  const [genre, setGenre] = useState('');
  const [targetLength, setTargetLength] = useState(110);
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = useCallback(() => {
    setStep('form');
    setTitle('');
    setLogline('');
    setNotes('');
    setGenre('');
    setTargetLength(110);
    setIsCreating(false);
  }, []);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
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

    await onCreate(name, parts.join('\n'), {
      genre: genre || undefined,
      logline: logline || undefined,
      notes: notes || undefined,
      targetLength,
    });
    setIsCreating(false);
    setStep('choice');
  }, [title, logline, notes, genre, targetLength, onCreate]);

  const handleGuide = useCallback(() => {
    // Store guide context in sessionStorage so the guide page can read it.
    const guideContext = {
      projectTitle: title.trim() || 'Untitled Screenplay',
      genre: genre || undefined,
      logline: logline || undefined,
      notes: notes || undefined,
    };
    try {
      sessionStorage.setItem(
        'screenwriter:guideContext',
        JSON.stringify(guideContext),
      );
    } catch {
      // Ignore storage errors.
    }
    onClose();
    resetForm();
    router.push('/guide');
  }, [title, genre, logline, notes, onClose, resetForm, router]);

  const handleEditor = useCallback(() => {
    onClose();
    resetForm();
    router.push('/editor');
  }, [onClose, resetForm, router]);

  const handleClose = useCallback(() => {
    onClose();
    resetForm();
  }, [onClose, resetForm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-ds-xl p-0 overflow-hidden">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-xl font-semibold text-foreground">Create New Project</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
                  placeholder="Any additional notes or inspiration..."
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
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/50">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleCreate}
                className="gap-1.5"
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Project'}
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Choice */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-xl font-semibold text-foreground">How do you want to start?</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-3">
              {/* AI Story Guide option */}
              <button
                onClick={handleGuide}
                className="w-full rounded-lg border-2 border-primary/40 bg-primary/5 p-4 text-left hover:border-primary hover:bg-primary/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      Start with AI Story Guide
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Develop your story through guided conversation. Build characters,
                      beat sheet, and a scene outline before writing.
                    </p>
                  </div>
                </div>
              </button>

              {/* Jump to editor option */}
              <button
                onClick={handleEditor}
                className="w-full rounded-lg border border-border bg-muted/20 p-4 text-left hover:border-foreground/20 hover:bg-muted/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      Jump to Editor
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start writing immediately with a blank screenplay.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
