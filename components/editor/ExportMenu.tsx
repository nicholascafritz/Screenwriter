'use client';

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/lib/store/editor';
import { useProjectStore } from '@/lib/store/project';
import { parseFountain } from '@/lib/fountain/parser';
import { serializeFountain } from '@/lib/fountain/serializer';
import { fountainToFDX } from '@/lib/export/fountain-to-fdx';
import {
  downloadFountain,
  downloadTxt,
  downloadFDX,
  downloadPDF,
} from '@/lib/export/download';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';
import { Download, Save, FileText, FileType, FileCode, Loader2 } from 'lucide-react';

export default function ExportMenu() {
  const content = useEditorStore((s) => s.content);
  const projectName = useProjectStore((s) => s.name);
  const saveCurrentProject = useProjectStore((s) => s.saveCurrentProject);

  const [exporting, setExporting] = useState(false);

  const handleSave = useCallback(() => {
    saveCurrentProject();
  }, [saveCurrentProject]);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      await downloadPDF(content, projectName);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [content, projectName]);

  const handleExportFountain = useCallback(() => {
    downloadFountain(content, projectName);
  }, [content, projectName]);

  const handleExportFDX = useCallback(() => {
    try {
      const screenplay = parseFountain(content);
      const fdxXml = fountainToFDX(screenplay);
      downloadFDX(fdxXml, projectName);
    } catch (err) {
      console.error('FDX export failed:', err);
    }
  }, [content, projectName]);

  const handleExportTxt = useCallback(() => {
    try {
      const screenplay = parseFountain(content);
      const plainText = serializeFountain(screenplay);
      downloadTxt(plainText, projectName);
    } catch {
      downloadTxt(content, projectName);
    }
  }, [content, projectName]);

  return (
    <DropdownMenu>
      <Tooltip content="Save & Export">
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Project
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportFountain} className="gap-2">
          <FileCode className="h-4 w-4" />
          Export as Fountain
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportFDX} className="gap-2">
          <FileType className="h-4 w-4" />
          Export as FDX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportTxt} className="gap-2">
          <FileText className="h-4 w-4" />
          Export as Plain Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
