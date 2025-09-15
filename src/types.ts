export interface YotoIconMapping {
  [keyword: string]: string; // keyword -> "yoto:#iconId"
}

export interface YotoSynonyms {
  [keyword: string]: string[]; // keyword -> array of synonyms
}

export interface YotoPlaylist {
  id: string;
  title: string;
  tracks: YotoTrack[];
}

export interface YotoTrack {
  id: string;
  title: string;
  display?: {
    icon16x16?: string;
  };
  chapterKey?: string;
  trackKey?: string;
}

export interface PlanOptions {
  bearer: string;
  language: 'english' | 'hebrew';
  startFrom?: number; // Resume from specific index
  batchSize?: number; // Process icons in batches
}

export interface ApplyOptions {
  bearer: string;
  playlist: string;
  dryRun?: boolean;
  aiMatch?: boolean; // Use OpenAI to find closest matches
  language?: 'english' | 'hebrew'; // Language for icon mappings
}

export interface VisionResult {
  iconId: string;
  keyword: string;
  success: boolean;
  error?: string;
}

export type Language = 'english' | 'hebrew';

export interface LanguagePrompts {
  english: string;
  hebrew: string;
}