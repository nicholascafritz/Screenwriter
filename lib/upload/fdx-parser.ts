// ---------------------------------------------------------------------------
// FDX Parser -- Final Draft XML → Fountain converter
// ---------------------------------------------------------------------------
//
// Uses the browser's built-in DOMParser (zero external dependencies).
// Handles the most common paragraph types found in .fdx files:
//   Scene Heading, Action, Character, Dialogue, Parenthetical,
//   Transition, Shot, Lyrics, and General (fallback to action).
//
// Title page fields (Title, Author, etc.) are extracted from
// <HeaderAndFooter> or <TitlePage> elements when present.
// ---------------------------------------------------------------------------

/** Map of FDX paragraph Type attribute → handler key. */
const PARAGRAPH_TYPE_MAP: Record<string, string> = {
  'Scene Heading': 'scene_heading',
  'Action': 'action',
  'Character': 'character',
  'Dialogue': 'dialogue',
  'Parenthetical': 'parenthetical',
  'Transition': 'transition',
  'Shot': 'shot',
  'Lyrics': 'lyrics',
  'General': 'action',
  'Cast List': 'action',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a Final Draft XML string to Fountain-formatted text.
 *
 * @param xml  Raw XML content of a .fdx file.
 * @returns    Fountain-format string.
 */
export function fdxToFountain(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const lines: string[] = [];

  // -- Title page -----------------------------------------------------------
  const titlePage = extractTitlePage(doc);
  if (titlePage.length > 0) {
    lines.push(...titlePage, '');
  }

  // -- Body paragraphs ------------------------------------------------------
  const paragraphs = Array.from(doc.querySelectorAll('Paragraph'));
  let prevType = '';

  for (const para of paragraphs) {
    const rawType = para.getAttribute('Type') ?? 'Action';
    const type = PARAGRAPH_TYPE_MAP[rawType] ?? 'action';
    const text = extractText(para);

    // Skip completely empty paragraphs.
    if (!text && type !== 'action') continue;

    switch (type) {
      case 'scene_heading':
        // Blank line before scene headings.
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        lines.push(text.toUpperCase());
        break;

      case 'action':
        // Blank line before action blocks (unless following another action).
        if (prevType !== 'action' && lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        lines.push(text);
        break;

      case 'character':
        // Blank line before character cues.
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        lines.push(text.toUpperCase());
        break;

      case 'dialogue':
        lines.push(text);
        break;

      case 'parenthetical':
        lines.push(text.startsWith('(') ? text : `(${text})`);
        break;

      case 'transition':
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        // Fountain transitions must end with "TO:" — force uppercase.
        const upper = text.toUpperCase();
        lines.push(upper.endsWith('TO:') ? `> ${upper}` : `> ${upper}`);
        break;

      case 'shot':
        if (lines.length > 0 && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        // Shots are treated as scene headings prefixed with a period if needed.
        lines.push(text.toUpperCase());
        break;

      case 'lyrics':
        lines.push(`~${text}`);
        break;

      default:
        lines.push(text);
    }

    prevType = type;
  }

  // Ensure trailing newline.
  return lines.join('\n').trim() + '\n';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract concatenated text from all <Text> children of a <Paragraph>. */
function extractText(paragraph: Element): string {
  const textNodes = Array.from(paragraph.querySelectorAll('Text'));
  let result = '';
  for (const node of textNodes) {
    result += node.textContent ?? '';
  }
  return result.trim();
}

/**
 * Extract title page fields from <TitlePage> or <HeaderAndFooter>.
 * Returns an array of Fountain title page lines (e.g. "Title: My Script").
 */
function extractTitlePage(doc: Document): string[] {
  const lines: string[] = [];

  // Try <TitlePage> first.
  const titlePage = doc.querySelector('TitlePage');
  if (titlePage) {
    const content = titlePage.querySelector('Content');
    if (content) {
      const titleParas = Array.from(content.querySelectorAll('Paragraph'));
      // FDX title page paragraphs often have Type attributes like
      // "Title", "Author", "Source", etc.
      let currentField = '';
      for (const para of titleParas) {
        const type = para.getAttribute('Type') ?? '';
        const text = extractText(para);
        if (!text) continue;

        const fieldName = mapTitleField(type);
        if (fieldName && fieldName !== currentField) {
          lines.push(`${fieldName}: ${text}`);
          currentField = fieldName;
        } else if (currentField) {
          // Continuation line — indent with 3 spaces for multi-line fields.
          lines.push(`   ${text}`);
        }
      }
    }
  }

  // If we didn't get a title, try the document attributes.
  if (lines.length === 0) {
    const fd = doc.querySelector('FinalDraft');
    const title = fd?.getAttribute('Title');
    if (title) {
      lines.push(`Title: ${title}`);
    }
  }

  return lines;
}

/** Map FDX title-page paragraph type to Fountain field name. */
function mapTitleField(fdxType: string): string | null {
  const lower = fdxType.toLowerCase();
  if (lower.includes('title')) return 'Title';
  if (lower.includes('author') || lower.includes('written by')) return 'Author';
  if (lower.includes('source')) return 'Source';
  if (lower.includes('draft')) return 'Draft date';
  if (lower.includes('date')) return 'Date';
  if (lower.includes('contact')) return 'Contact';
  if (lower.includes('credit')) return 'Credit';
  if (lower.includes('copyright')) return 'Copyright';
  if (lower.includes('notes')) return 'Notes';
  return null;
}
