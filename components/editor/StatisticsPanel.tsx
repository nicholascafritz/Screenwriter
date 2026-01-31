'use client';

import { useMemo } from 'react';
import { X, BarChart3, FileText, Users, MapPin, MessageSquare, Clapperboard } from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor';
import { analyzeScreenplay } from '@/lib/fountain/analytics';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatisticsPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatisticsPanel({ open, onClose }: StatisticsPanelProps) {
  const screenplay = useEditorStore((s) => s.screenplay);

  // Compute analytics from the screenplay
  const stats = useMemo(() => {
    if (!screenplay) return null;
    return analyzeScreenplay(screenplay);
  }, [screenplay]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Panel content */}
      <div className="relative z-50 w-full max-w-2xl rounded-lg border border-border bg-background shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Script Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {!stats ? (
            <p className="text-muted-foreground text-center py-8">
              No screenplay loaded
            </p>
          ) : (
            <div className="space-y-8">
              {/* Overview Stats */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Overview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard
                    icon={<FileText className="h-4 w-4" />}
                    label="Pages"
                    value={stats.pageCount}
                    subtext={stats.pageCount === 1 ? 'page' : 'pages'}
                  />
                  <StatCard
                    icon={<Clapperboard className="h-4 w-4" />}
                    label="Scenes"
                    value={stats.sceneCount}
                    subtext={stats.sceneCount === 1 ? 'scene' : 'scenes'}
                  />
                  <StatCard
                    icon={<Users className="h-4 w-4" />}
                    label="Characters"
                    value={stats.characters.length}
                    subtext="unique"
                  />
                  <StatCard
                    icon={<MapPin className="h-4 w-4" />}
                    label="Locations"
                    value={stats.locations.length}
                    subtext="unique"
                  />
                </div>
              </section>

              {/* Dialogue vs Action */}
              <section>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Dialogue / Action Balance
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      Dialogue
                    </span>
                    <span className="font-medium">{stats.dialogueCount} blocks</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      Action
                    </span>
                    <span className="font-medium">{stats.actionCount} blocks</span>
                  </div>

                  {/* Visual ratio bar */}
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    {stats.dialogueCount + stats.actionCount > 0 && (
                      <>
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{
                            width: `${(stats.dialogueCount / (stats.dialogueCount + stats.actionCount)) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{
                            width: `${(stats.actionCount / (stats.dialogueCount + stats.actionCount)) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {stats.dialogueToActionRatio > 1
                      ? `Dialogue-heavy (${stats.dialogueToActionRatio.toFixed(1)}:1 ratio)`
                      : stats.dialogueToActionRatio > 0
                      ? `Action-heavy (1:${(1 / stats.dialogueToActionRatio).toFixed(1)} ratio)`
                      : 'No data yet'}
                  </p>
                </div>
              </section>

              {/* Character Breakdown */}
              {stats.characterDialogueCounts.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    Top Characters by Dialogue
                  </h3>
                  <div className="space-y-2">
                    {stats.characterDialogueCounts.slice(0, 10).map((char, idx) => {
                      const maxCount = stats.characterDialogueCounts[0]?.count || 1;
                      const percentage = (char.count / maxCount) * 100;

                      return (
                        <div key={char.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="text-muted-foreground w-4 text-right">
                                {idx + 1}.
                              </span>
                              <span className="font-medium">{char.name}</span>
                            </span>
                            <span className="text-muted-foreground">
                              {char.count} {char.count === 1 ? 'line' : 'lines'}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-6">
                            <div
                              className="h-full bg-primary/60 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {stats.characterDialogueCounts.length > 10 && (
                      <p className="text-xs text-muted-foreground ml-6 pt-2">
                        + {stats.characterDialogueCounts.length - 10} more characters
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Locations List */}
              {stats.locations.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                    Locations ({stats.locations.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.locations.slice(0, 20).map((location) => (
                      <span
                        key={location}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium"
                      >
                        {location}
                      </span>
                    ))}
                    {stats.locations.length > 20 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                        + {stats.locations.length - 20} more
                      </span>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{subtext}</span>
      </div>
    </div>
  );
}
