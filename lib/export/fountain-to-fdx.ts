// ---------------------------------------------------------------------------
// Fountain → Final Draft XML (FDX) Converter
// ---------------------------------------------------------------------------
//
// Converts a parsed Screenplay AST into Final Draft XML format.
// No external dependencies -- builds XML via string concatenation with
// proper entity escaping.
// ---------------------------------------------------------------------------

import type { Screenplay, ScriptElement, ElementType } from '@/lib/fountain/types';

// ---------------------------------------------------------------------------
// Element type mapping (Fountain → FDX)
// ---------------------------------------------------------------------------

const ELEMENT_TO_FDX: Record<ElementType, string | null> = {
  title_page: null,
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  centered: 'Action',
  section: null,
  synopsis: null,
  note: null,
  boneyard: null,
  page_break: null,
  lyric: 'Action',
  dual_dialogue_begin: null,
  dual_dialogue_end: null,
};

// ---------------------------------------------------------------------------
// XML escaping
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a parsed Screenplay to Final Draft XML (.fdx) format.
 */
export function fountainToFDX(screenplay: Screenplay): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<FinalDraft DocumentType="Script" Template="No" Version="4">');

  // Title page
  lines.push(...buildTitlePage(screenplay.titlePage));

  // Content
  lines.push('  <Content>');
  lines.push(...buildContent(screenplay.elements));
  lines.push('  </Content>');

  lines.push('</FinalDraft>');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Title page builder
// ---------------------------------------------------------------------------

function buildTitlePage(titlePage: Record<string, string>): string[] {
  const entries = Object.entries(titlePage);
  if (entries.length === 0) return [];

  const lines: string[] = [];
  lines.push('  <TitlePage>');
  lines.push('    <Content>');

  for (const [key, value] of entries) {
    const fdxType = mapTitleFieldToFDX(key);
    lines.push(`      <Paragraph Type="${escapeXml(fdxType)}">`);
    lines.push(`        <Text>${escapeXml(value)}</Text>`);
    lines.push('      </Paragraph>');
  }

  lines.push('    </Content>');
  lines.push('  </TitlePage>');

  return lines;
}

function mapTitleFieldToFDX(key: string): string {
  const lower = key.toLowerCase();
  if (lower === 'title') return 'Title';
  if (lower === 'author' || lower === 'authors') return 'Author';
  if (lower === 'credit') return 'Credit';
  if (lower === 'source') return 'Source';
  if (lower.includes('draft')) return 'Draft';
  if (lower === 'date') return 'Date';
  if (lower === 'contact') return 'Contact';
  if (lower === 'copyright') return 'Copyright';
  if (lower === 'notes') return 'Notes';
  // Fallback: capitalize
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// ---------------------------------------------------------------------------
// Content builder
// ---------------------------------------------------------------------------

function buildContent(elements: ScriptElement[]): string[] {
  const lines: string[] = [];

  for (const el of elements) {
    const fdxType = ELEMENT_TO_FDX[el.type];
    if (fdxType === null) continue;

    const attrs = buildParagraphAttrs(el, fdxType);
    lines.push(`    <Paragraph${attrs}>`);
    lines.push(`      <Text>${escapeXml(el.text)}</Text>`);
    lines.push('    </Paragraph>');
  }

  return lines;
}

function buildParagraphAttrs(el: ScriptElement, fdxType: string): string {
  let attrs = ` Type="${escapeXml(fdxType)}"`;

  if (el.type === 'scene_heading' && el.sceneNumber) {
    attrs += ` Number="${escapeXml(el.sceneNumber)}"`;
  }

  return attrs;
}
