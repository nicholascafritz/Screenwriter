// ---------------------------------------------------------------------------
// API Route -- /api/export/pdf
// ---------------------------------------------------------------------------
//
// Server-side PDF generation from Fountain screenplay content using pdfkit.
// Renders in standard screenplay format: Courier 12pt, US Letter.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { parseFountain } from '@/lib/fountain/parser';
import type { ScriptElement } from '@/lib/fountain/types';

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Constants -- industry-standard screenplay formatting
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 612;   // US Letter width in points
const PAGE_HEIGHT = 792;  // US Letter height in points
const MARGIN_LEFT = 108;  // 1.5" left margin
const MARGIN_RIGHT = 72;  // 1" right margin
const MARGIN_TOP = 72;    // 1" top margin
const MARGIN_BOTTOM = 72; // 1" bottom margin
const FONT_SIZE = 12;
const LINE_HEIGHT = FONT_SIZE * 1.2;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Element-specific positioning (relative to left margin)
const CHARACTER_INDENT = 160;  // ~3.7" from left edge
const DIALOGUE_INDENT = 72;   // ~2.5" from left edge
const DIALOGUE_WIDTH = 216;   // ~3" width
const PAREN_INDENT = 108;     // ~3.1" from left edge
const PAREN_WIDTH = 180;      // ~2.5" width

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title } = body as { content: string; title?: string };

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing "content" field' }, { status: 400 });
    }

    const screenplay = parseFountain(content);
    const filename = title || screenplay.titlePage?.title || 'screenplay';

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      bufferPages: true,
    });

    // Collect PDF data into buffer
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Register Courier font (built into pdfkit)
    doc.font('Courier').fontSize(FONT_SIZE);

    // -- Title page -----------------------------------------------------------
    if (Object.keys(screenplay.titlePage).length > 0) {
      renderTitlePage(doc, screenplay.titlePage);
      doc.addPage();
    }

    // -- Body -----------------------------------------------------------------
    let y = MARGIN_TOP;

    for (let i = 0; i < screenplay.elements.length; i++) {
      const el = screenplay.elements[i];
      const prevEl = i > 0 ? screenplay.elements[i - 1] : null;

      const spacing = getSpacingBefore(el, prevEl);
      y += spacing;

      const height = estimateElementHeight(doc, el);

      // Check if we need a new page
      if (y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
        doc.addPage();
        y = MARGIN_TOP;
      }

      y = renderElement(doc, el, y);
    }

    doc.end();

    const pdfBuffer = await pdfReady;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Title page renderer
// ---------------------------------------------------------------------------

function renderTitlePage(doc: PDFKit.PDFDocument, titlePage: Record<string, string>): void {
  const centerY = PAGE_HEIGHT / 2 - 60;

  // Title (centered, larger)
  if (titlePage.title) {
    doc.font('Courier-Bold').fontSize(24);
    doc.text(titlePage.title, MARGIN_LEFT, centerY, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
    doc.font('Courier').fontSize(FONT_SIZE);
  }

  let y = centerY + 48;

  // Credit line
  if (titlePage.credit) {
    doc.text(titlePage.credit, MARGIN_LEFT, y, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
    y += LINE_HEIGHT * 1.5;
  }

  // Author
  if (titlePage.author || titlePage.authors) {
    doc.text(titlePage.author || titlePage.authors || '', MARGIN_LEFT, y, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
    y += LINE_HEIGHT * 1.5;
  }

  // Source
  if (titlePage.source) {
    doc.text(titlePage.source, MARGIN_LEFT, y, {
      width: CONTENT_WIDTH,
      align: 'center',
    });
    y += LINE_HEIGHT * 1.5;
  }

  // Draft date and contact at bottom-right
  let bottomY = PAGE_HEIGHT - MARGIN_BOTTOM - 60;

  if (titlePage['draft date']) {
    doc.text(titlePage['draft date'], MARGIN_LEFT, bottomY, {
      width: CONTENT_WIDTH,
      align: 'left',
    });
    bottomY += LINE_HEIGHT;
  }

  if (titlePage.contact) {
    doc.text(titlePage.contact, MARGIN_LEFT, bottomY, {
      width: CONTENT_WIDTH,
      align: 'left',
    });
  }
}

// ---------------------------------------------------------------------------
// Element renderer
// ---------------------------------------------------------------------------

function renderElement(doc: PDFKit.PDFDocument, el: ScriptElement, y: number): number {
  switch (el.type) {
    case 'scene_heading': {
      doc.font('Courier-Bold').fontSize(FONT_SIZE);
      const text = el.text.toUpperCase();
      doc.text(text, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
      const height = doc.heightOfString(text, { width: CONTENT_WIDTH });
      doc.font('Courier').fontSize(FONT_SIZE);
      return y + height;
    }

    case 'action': {
      doc.font('Courier').fontSize(FONT_SIZE);
      doc.text(el.text, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
      return y + doc.heightOfString(el.text, { width: CONTENT_WIDTH });
    }

    case 'character': {
      doc.font('Courier').fontSize(FONT_SIZE);
      const text = el.text.toUpperCase();
      doc.text(text, MARGIN_LEFT + CHARACTER_INDENT, y, {
        width: CONTENT_WIDTH - CHARACTER_INDENT,
      });
      return y + doc.heightOfString(text, { width: CONTENT_WIDTH - CHARACTER_INDENT });
    }

    case 'dialogue': {
      doc.font('Courier').fontSize(FONT_SIZE);
      doc.text(el.text, MARGIN_LEFT + DIALOGUE_INDENT, y, {
        width: DIALOGUE_WIDTH,
      });
      return y + doc.heightOfString(el.text, { width: DIALOGUE_WIDTH });
    }

    case 'parenthetical': {
      doc.font('Courier').fontSize(FONT_SIZE);
      doc.text(el.text, MARGIN_LEFT + PAREN_INDENT, y, {
        width: PAREN_WIDTH,
      });
      return y + doc.heightOfString(el.text, { width: PAREN_WIDTH });
    }

    case 'transition': {
      doc.font('Courier').fontSize(FONT_SIZE);
      doc.text(el.text.toUpperCase(), MARGIN_LEFT, y, {
        width: CONTENT_WIDTH,
        align: 'right',
      });
      return y + LINE_HEIGHT;
    }

    case 'centered': {
      doc.font('Courier').fontSize(FONT_SIZE);
      doc.text(el.text, MARGIN_LEFT, y, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
      return y + doc.heightOfString(el.text, { width: CONTENT_WIDTH });
    }

    case 'page_break': {
      doc.addPage();
      return MARGIN_TOP;
    }

    case 'lyric': {
      doc.font('Courier-Oblique').fontSize(FONT_SIZE);
      doc.text(el.text, MARGIN_LEFT, y, { width: CONTENT_WIDTH });
      const height = doc.heightOfString(el.text, { width: CONTENT_WIDTH });
      doc.font('Courier').fontSize(FONT_SIZE);
      return y + height;
    }

    default:
      return y;
  }
}

// ---------------------------------------------------------------------------
// Spacing helpers
// ---------------------------------------------------------------------------

function getSpacingBefore(el: ScriptElement, prev: ScriptElement | null): number {
  if (!prev) return 0;

  switch (el.type) {
    case 'scene_heading':
      return LINE_HEIGHT * 2;
    case 'character':
      return LINE_HEIGHT;
    case 'transition':
      return LINE_HEIGHT;
    case 'action':
      if (prev.type === 'dialogue' || prev.type === 'parenthetical') return LINE_HEIGHT;
      if (prev.type === 'action') return LINE_HEIGHT;
      return LINE_HEIGHT;
    case 'dialogue':
    case 'parenthetical':
      return 0;
    default:
      return LINE_HEIGHT;
  }
}

function estimateElementHeight(doc: PDFKit.PDFDocument, el: ScriptElement): number {
  switch (el.type) {
    case 'dialogue':
      return doc.heightOfString(el.text, { width: DIALOGUE_WIDTH });
    case 'parenthetical':
      return doc.heightOfString(el.text, { width: PAREN_WIDTH });
    case 'character':
      return LINE_HEIGHT;
    default:
      return doc.heightOfString(el.text || ' ', { width: CONTENT_WIDTH });
  }
}
