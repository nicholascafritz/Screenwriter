// ---------------------------------------------------------------------------
// Download Utilities -- Client-side file download helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Filename sanitization
// ---------------------------------------------------------------------------

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 200) || 'untitled';
}

// ---------------------------------------------------------------------------
// Core download helper
// ---------------------------------------------------------------------------

export function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Format-specific wrappers
// ---------------------------------------------------------------------------

export function downloadFountain(content: string, title: string): void {
  downloadText(content, `${sanitizeFilename(title)}.fountain`, 'text/plain;charset=utf-8');
}

export function downloadTxt(content: string, title: string): void {
  downloadText(content, `${sanitizeFilename(title)}.txt`, 'text/plain;charset=utf-8');
}

export function downloadFDX(fdxXml: string, title: string): void {
  downloadText(fdxXml, `${sanitizeFilename(title)}.fdx`, 'application/xml;charset=utf-8');
}

export async function downloadPDF(content: string, title: string): Promise<void> {
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, title }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`PDF export failed: ${response.status} - ${errorText}`);
  }

  const blob = await response.blob();
  downloadBlob(blob, `${sanitizeFilename(title)}.pdf`);
}
