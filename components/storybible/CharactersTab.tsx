'use client';

import React, { useState } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ChevronDown, ChevronRight, User } from 'lucide-react';

export default function CharactersTab() {
  const bible = useStoryBibleStore((s) => s.bible);
  const addCharacter = useStoryBibleStore((s) => s.addCharacter);
  const updateCharacter = useStoryBibleStore((s) => s.updateCharacter);
  const removeCharacter = useStoryBibleStore((s) => s.removeCharacter);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  if (!bible) return null;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCharacter(trimmed);
    setNewName('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add character */}
      <div className="p-2 border-b border-border shrink-0 flex gap-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Character name..."
          className="text-xs h-7 flex-1"
        />
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleAdd}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {bible.characters.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-6">
              <User className="h-5 w-5 mx-auto mb-1 opacity-40" />
              <p>No characters yet</p>
            </div>
          ) : (
            bible.characters.map((char) => {
              const isExpanded = expandedId === char.id;
              return (
                <div key={char.id} className="border border-border rounded-md">
                  {/* Header */}
                  <button
                    className="flex items-center w-full p-2 text-xs font-medium text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : char.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 mr-1 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{char.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCharacter(char.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </button>

                  {/* Expanded form */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-2 border-t border-border pt-2">
                      <Input
                        value={char.name}
                        onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                        placeholder="Name"
                        className="text-xs h-7"
                      />
                      <Textarea
                        value={char.description}
                        onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                        placeholder="Description (age, appearance, personality)..."
                        className="text-xs min-h-[50px] resize-none"
                        rows={2}
                      />
                      <Textarea
                        value={char.arc}
                        onChange={(e) => updateCharacter(char.id, { arc: e.target.value })}
                        placeholder="Character arc (want, need, transformation)..."
                        className="text-xs min-h-[50px] resize-none"
                        rows={2}
                      />
                      <Textarea
                        value={char.notes}
                        onChange={(e) => updateCharacter(char.id, { notes: e.target.value })}
                        placeholder="Notes..."
                        className="text-xs min-h-[40px] resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
