// ---------------------------------------------------------------------------
// TRIPOD -- TypeScript Type Definitions
// ---------------------------------------------------------------------------
//
// Types for the TRIPOD turning point reference data used to enhance
// the app's screenplay structure analysis with empirical norms from
// 84 professionally produced films.
// ---------------------------------------------------------------------------

/** Statistical position data for a single turning point. */
export interface TurningPointPosition {
  /** Mean relative position (0–1) across all annotated films. */
  mean: number;
  /** Median relative position. */
  median: number;
  /** 10th percentile — early boundary. */
  p10: number;
  /** 25th percentile — typical early. */
  p25: number;
  /** 75th percentile — typical late. */
  p75: number;
  /** 90th percentile — late boundary. */
  p90: number;
}

/** Norm data for one of the five turning points. */
export interface TurningPointNorm {
  /** Canonical name (e.g. "Opportunity"). */
  name: string;
  /** Alternative names used in screenwriting literature. */
  aliases: string[];
  /** Corresponding Save the Cat beat name. */
  savetheCatBeat: string;
  /** Empirical position statistics (0–1, relative to screenplay length). */
  position: TurningPointPosition;
  /** Page guide for a standard 120-page screenplay. */
  pageGuide: { median: number; typicalRange: [number, number] };
  /** Short description of the beat's narrative function. */
  description: string;
}

/** A condensed turning point reference from a specific film. */
export interface TripodMovieTurningPoint {
  /** 1-based sentence index in the synopsis. */
  index: number;
  /** Relative position (0–1). */
  pct: number;
  /** The synopsis sentence at this turning point. */
  text: string;
}

/** A reference film example with all five turning points. */
export interface TripodMovieExample {
  /** Film title. */
  movie: string;
  /** Total sentences in the synopsis. */
  totalSentences: number;
  /** The five turning points. */
  turningPoints: {
    tp1: TripodMovieTurningPoint;
    tp2: TripodMovieTurningPoint;
    tp3: TripodMovieTurningPoint;
    tp4: TripodMovieTurningPoint;
    tp5: TripodMovieTurningPoint;
  };
}

/** Key type for the five turning points. */
export type TurningPointKey = 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5';

/** Result of detecting a turning point in a user's screenplay. */
export interface TurningPointDetection {
  /** Which turning point this is. */
  key: TurningPointKey;
  /** The norm data for this TP. */
  norm: TurningPointNorm;
  /** Expected scene index based on median position. */
  expectedSceneIdx: number;
  /** Detected scene index (best candidate), or null if not found. */
  detectedSceneIdx: number | null;
  /** Detected scene heading, if found. */
  detectedSceneHeading: string | null;
  /** The detection confidence score (0–1). */
  confidence: number;
  /** Whether the detected position falls within the typical range (P25–P75). */
  withinTypicalRange: boolean;
  /** Whether the detected position falls within the extended range (P10–P90). */
  withinExtendedRange: boolean;
  /** Status label for display. */
  status: 'WITHIN RANGE' | 'SLIGHTLY EARLY' | 'SLIGHTLY LATE' | 'EARLY' | 'LATE' | 'NOT DETECTED';
}

/** Full comparison result for a screenplay against TRIPOD norms. */
export interface TripodComparison {
  /** Total scenes in the user's screenplay. */
  totalScenes: number;
  /** Estimated page count. */
  estimatedPages: number;
  /** Detection results for each turning point. */
  turningPoints: TurningPointDetection[];
  /** Selected reference films for comparison. */
  referenceExamples: TripodMovieExample[];
}
