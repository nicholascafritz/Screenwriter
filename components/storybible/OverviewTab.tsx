'use client';

import React, { useState, useCallback } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus } from 'lucide-react';

export default function OverviewTab() {
  const bible = useStoryBibleStore((s) => s.bible);
  const setGenre = useStoryBibleStore((s) => s.setGenre);
  const setTone = useStoryBibleStore((s) => s.setTone);
  const setLogline = useStoryBibleStore((s) => s.setLogline);
  const setSynopsis = useStoryBibleStore((s) => s.setSynopsis);
  const addTheme = useStoryBibleStore((s) => s.addTheme);
  const removeTheme = useStoryBibleStore((s) => s.removeTheme);
  const setCustomNotes = useStoryBibleStore((s) => s.setCustomNotes);

  const [themeInput, setThemeInput] = useState('');

  const handleAddTheme = useCallback(() => {
    const trimmed = themeInput.trim();
    if (!trimmed) return;
    addTheme(trimmed);
    setThemeInput('');
  }, [themeInput, addTheme]);

  if (!bible) return null;

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Genre */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Genre</label>
          <Input
            value={bible.genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g., Sci-Fi Thriller, Romantic Comedy..."
            className="text-xs h-8"
          />
        </div>

        {/* Tone */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tone</label>
          <Input
            value={bible.tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g., Dark and suspenseful, Light and whimsical..."
            className="text-xs h-8"
          />
        </div>

        {/* Themes */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Themes</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {bible.themes.map((theme) => (
              <Badge key={theme} variant="secondary" className="text-[10px] h-5 gap-1 pr-1">
                {theme}
                <button onClick={() => removeTheme(theme)} className="hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTheme()}
              placeholder="Add a theme..."
              className="text-xs h-7 flex-1"
            />
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleAddTheme}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Logline */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Logline</label>
          <Textarea
            value={bible.logline}
            onChange={(e) => setLogline(e.target.value)}
            placeholder="A one-sentence summary of your story..."
            className="text-xs min-h-[60px] resize-none"
            rows={2}
          />
        </div>

        {/* Synopsis */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Synopsis</label>
          <Textarea
            value={bible.synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="A short summary of the story arc..."
            className="text-xs min-h-[80px] resize-none"
            rows={4}
          />
        </div>

        {/* Custom Notes */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
          <Textarea
            value={bible.customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Any additional notes about the project..."
            className="text-xs min-h-[60px] resize-none"
            rows={3}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
