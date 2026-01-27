// ---------------------------------------------------------------------------
// API Route -- /api/validate
// ---------------------------------------------------------------------------
//
// Format validation endpoint.  Accepts a Fountain screenplay string, parses
// it, runs the validator and analytics engine, and returns a JSON response
// containing validity status, issues, and statistics.
//
// Response format:
//   {
//     "valid": true | false,
//     "issues": [
//       {
//         "line": 12,
//         "severity": "error" | "warning" | "info",
//         "rule": "orphaned-dialogue",
//         "message": "Dialogue line is not preceded by a character cue."
//       }
//     ],
//     "stats": {
//       "pageCount": 120,
//       "sceneCount": 45,
//       "characterCount": 12,
//       "dialogueToActionRatio": 1.5
//     }
//   }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { parseFountain } from '@/lib/fountain/parser';
import { validateScreenplay } from '@/lib/fountain/validator';
import { analyzeScreenplay } from '@/lib/fountain/analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidateRequestBody {
  screenplay: string;
}

interface ValidateResponse {
  valid: boolean;
  issues: Array<{
    line: number;
    severity: 'error' | 'warning' | 'info';
    rule: string;
    message: string;
  }>;
  stats: {
    pageCount: number;
    sceneCount: number;
    characterCount: number;
    dialogueToActionRatio: number;
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidateRequestBody;
    const { screenplay } = body;

    // Validate the request.
    if (screenplay === undefined || screenplay === null || typeof screenplay !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "screenplay" field. Expected a string.' },
        { status: 400 },
      );
    }

    // Parse the Fountain text into a structured AST.
    const parsed = parseFountain(screenplay);

    // Run the validator to detect formatting issues.
    const issues = validateScreenplay(parsed);

    // Run the analytics engine to compute statistics.
    const analytics = analyzeScreenplay(parsed);

    // Determine validity: a screenplay is "valid" if there are no errors.
    // Warnings and informational issues do not invalidate the screenplay.
    const hasErrors = issues.some((issue) => issue.severity === 'error');

    // Build the response.
    const response: ValidateResponse = {
      valid: !hasErrors,
      issues: issues.map((issue) => ({
        line: issue.line,
        severity: issue.severity,
        rule: issue.rule,
        message: issue.message,
      })),
      stats: {
        pageCount: analytics.pageCount,
        sceneCount: analytics.sceneCount,
        characterCount: analytics.characters.length,
        dialogueToActionRatio: Math.round(analytics.dialogueToActionRatio * 100) / 100,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
