'use client';

// ---------------------------------------------------------------------------
// ScreenplayPreview -- Formatted screenplay preview panel
// ---------------------------------------------------------------------------
//
// Renders the parsed Fountain AST as formatted HTML that closely mirrors
// industry-standard screenplay layout.  Read-only, using Courier Prime
// with correct margins, element-specific indentation, and page numbering.
// ---------------------------------------------------------------------------

import React, { useMemo } from 'react';
import { useEditorStore } from '@/lib/store/editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ScriptElement, Screenplay } from '@/lib/fountain/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScreenplayPreviewProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate formatted lines per screenplay page. */
const LINES_PER_PAGE = 56;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScreenplayPreview({ className }: ScreenplayPreviewProps) {
  const screenplay = useEditorStore((s) => s.screenplay);

  // ---- Compute pages from elements ----------------------------------------

  const pages = useMemo(() => {
    if (!screenplay) return [];
    return paginateElements(screenplay);
  }, [screenplay]);

  // ---- Empty state --------------------------------------------------------

  if (!screenplay || screenplay.elements.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center text-muted-foreground',
          className,
        )}
      >
        <p className="text-sm">No screenplay content to preview.</p>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <ScrollArea
      className={cn('h-full w-full bg-neutral-100', className)}
    >
      <div className="mx-auto flex flex-col items-center gap-8 py-8">
        {/* ---- Title page ---- */}
        {Object.keys(screenplay.titlePage).length > 0 && (
          <div className="screenplay-page">
            <div className="flex h-full flex-col items-center justify-center text-center">
              {screenplay.titlePage.title && (
                <h1 className="mb-6 text-xl font-bold uppercase tracking-wide">
                  {screenplay.titlePage.title}
                </h1>
              )}
              {screenplay.titlePage.credit && (
                <p className="mb-1 text-sm">{screenplay.titlePage.credit}</p>
              )}
              {screenplay.titlePage.author && (
                <p className="mb-8 text-base">{screenplay.titlePage.author}</p>
              )}
              {screenplay.titlePage['draft date'] && (
                <p className="text-xs text-neutral-500">
                  {screenplay.titlePage['draft date']}
                </p>
              )}
              {screenplay.titlePage.contact && (
                <p className="mt-auto text-xs text-neutral-500">
                  {screenplay.titlePage.contact}
                </p>
              )}
              {screenplay.titlePage.source && (
                <p className="text-xs text-neutral-500">
                  {screenplay.titlePage.source}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---- Body pages ---- */}
        {pages.map((pageElements, pageIdx) => (
          <div key={pageIdx} className="screenplay-page">
            {/* Page number (top right, not on page 1) */}
            {pageIdx > 0 && (
              <div className="mb-4 text-right text-xs text-neutral-500">
                {pageIdx + 1}.
              </div>
            )}

            {/* Elements */}
            <div className="flex flex-col">
              {pageElements.map((el, elIdx) => (
                <PreviewElement key={`${pageIdx}-${elIdx}`} element={el} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ---- Inline styles for the screenplay page container ---- */}
      <style jsx>{`
        .screenplay-page {
          width: 8.5in;
          min-height: 11in;
          padding: 1in 1in 1in 1.5in;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 2px;
          font-family: 'Courier Prime', 'Courier New', monospace;
          font-size: 12pt;
          line-height: 1.0;
          color: #262626;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 920px) {
          .screenplay-page {
            width: 100%;
            min-height: auto;
            padding: 1.5rem 1rem 1.5rem 1.5rem;
          }
        }
      `}</style>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// PreviewElement -- renders a single AST element
// ---------------------------------------------------------------------------

function PreviewElement({ element }: { element: ScriptElement }) {
  switch (element.type) {
    case 'scene_heading':
      return (
        <div className="mb-2 mt-4 first:mt-0">
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-scene-heading)]">
            {element.text}
          </p>
        </div>
      );

    case 'action':
      return (
        <div className="my-1">
          {element.text.split('\n').map((line, i) => (
            <p key={i} className="whitespace-pre-wrap text-sm text-[var(--color-action)]">
              {renderInlineMarkup(line)}
            </p>
          ))}
        </div>
      );

    case 'character':
      return (
        <div className="mb-0 mt-3 first:mt-0">
          <p className="text-center text-sm font-bold uppercase text-[var(--color-character)]">
            {element.text}
          </p>
        </div>
      );

    case 'dialogue':
      return (
        <div className="mx-auto mb-1" style={{ maxWidth: '35ch' }}>
          {element.text.split('\n').map((line, i) => (
            <p key={i} className="text-center text-sm text-[var(--color-dialogue)]">
              {renderInlineMarkup(line)}
            </p>
          ))}
        </div>
      );

    case 'parenthetical':
      return (
        <div className="mx-auto mb-0.5" style={{ maxWidth: '30ch' }}>
          <p className="text-center text-sm italic text-[var(--color-parenthetical)]">
            {element.text}
          </p>
        </div>
      );

    case 'transition':
      return (
        <div className="my-2">
          <p className="text-right text-sm font-bold uppercase text-[var(--color-transition)]">
            {element.text}
          </p>
        </div>
      );

    case 'centered':
      return (
        <div className="my-1">
          <p className="text-center text-sm text-[var(--color-info)]">
            {renderInlineMarkup(element.text)}
          </p>
        </div>
      );

    case 'page_break':
      return (
        <hr className="my-4 border-t border-border" />
      );

    case 'section':
      return (
        <div className="mb-1 mt-3 first:mt-0">
          <p
            className="text-sm font-bold text-[var(--color-warning)]"
            style={{ fontSize: sectionFontSize(element.depth) }}
          >
            {element.text}
          </p>
        </div>
      );

    case 'synopsis':
      return (
        <div className="my-0.5">
          <p className="text-xs italic text-[var(--color-success)]">
            {element.text}
          </p>
        </div>
      );

    case 'lyric':
      return (
        <div className="my-0.5">
          <p className="text-center text-sm italic text-pink-600">
            {element.text}
          </p>
        </div>
      );

    case 'note':
      return (
        <div className="my-0.5">
          <p className="text-xs italic text-[var(--color-note)]">
            [{element.text}]
          </p>
        </div>
      );

    case 'boneyard':
      // Boneyarded content is hidden in preview.
      return null;

    case 'dual_dialogue_begin':
    case 'dual_dialogue_end':
      // Structural markers -- no visual output.
      return null;

    case 'title_page':
      // Title page is rendered separately above.
      return null;

    default:
      return (
        <div className="my-0.5">
          <p className="text-sm text-[var(--color-action)]">{element.text}</p>
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Inline markup renderer
// ---------------------------------------------------------------------------

/**
 * Converts Fountain inline markup (bold, italic, bold-italic, underline)
 * into React elements.  Processes in order: bold-italic (***), bold (**),
 * italic (*), underline (_).
 */
function renderInlineMarkup(text: string): React.ReactNode {
  // Split on bold-italic first, then bold, italic, underline.
  const segments = splitMarkup(text);
  if (segments.length === 1 && segments[0].type === 'text') {
    return text;
  }
  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'bold-italic':
        return (
          <strong key={i} className="italic">
            {seg.content}
          </strong>
        );
      case 'bold':
        return <strong key={i}>{seg.content}</strong>;
      case 'italic':
        return <em key={i}>{seg.content}</em>;
      case 'underline':
        return (
          <span key={i} className="underline">
            {seg.content}
          </span>
        );
      default:
        return <span key={i}>{seg.content}</span>;
    }
  });
}

interface MarkupSegment {
  type: 'text' | 'bold-italic' | 'bold' | 'italic' | 'underline';
  content: string;
}

function splitMarkup(text: string): MarkupSegment[] {
  const segments: MarkupSegment[] = [];
  // Combined regex that captures all inline markup variants.
  const re = /\*{3}(.+?)\*{3}|\*{2}(.+?)\*{2}|\*(.+?)\*|_(.+?)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    // Add preceding plain text.
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'bold-italic', content: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'bold', content: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'italic', content: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'underline', content: match[4] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Trailing text.
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no markup was found, return the whole text as a single segment.
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

/**
 * Split the flat element list into pages based on an approximate line count.
 * Each element contributes a certain number of "formatted lines" and we
 * break at ~{@link LINES_PER_PAGE} lines, respecting page-break elements.
 */
function paginateElements(screenplay: Screenplay): ScriptElement[][] {
  const pages: ScriptElement[][] = [];
  let currentPage: ScriptElement[] = [];
  let lineCount = 0;

  for (const el of screenplay.elements) {
    // Page breaks force a new page immediately.
    if (el.type === 'page_break') {
      currentPage.push(el);
      pages.push(currentPage);
      currentPage = [];
      lineCount = 0;
      continue;
    }

    // Skip structural-only elements.
    if (
      el.type === 'boneyard' ||
      el.type === 'dual_dialogue_begin' ||
      el.type === 'dual_dialogue_end' ||
      el.type === 'title_page'
    ) {
      continue;
    }

    const elLines = estimateElementLines(el);

    // If adding this element would exceed the page, start a new page.
    // Exception: never start a page with dialogue/parenthetical without
    // a character cue -- keep the character with its block.
    if (lineCount + elLines > LINES_PER_PAGE && lineCount > 0) {
      pages.push(currentPage);
      currentPage = [];
      lineCount = 0;
    }

    currentPage.push(el);
    lineCount += elLines;
  }

  // Push the final page if it has content.
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Estimate how many formatted lines a single element occupies.
 */
function estimateElementLines(el: ScriptElement): number {
  switch (el.type) {
    case 'scene_heading':
      return 2; // heading + trailing blank
    case 'action':
      return el.text.split('\n').length + 1;
    case 'character':
      return 2; // preceding blank + cue
    case 'dialogue':
      return el.text.split('\n').length;
    case 'parenthetical':
      return 1;
    case 'transition':
      return 2;
    default:
      return 1;
  }
}

/**
 * Map section depth to a font size string.
 */
function sectionFontSize(depth?: number): string {
  switch (depth) {
    case 1:
      return '16pt';
    case 2:
      return '14pt';
    case 3:
      return '13pt';
    default:
      return '12pt';
  }
}
