export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface SessionData {
  session_id: string;
  paragraphs: string[];
  extracted: string;
  word_timings: WordTiming[];
  has_audio: boolean;
  has_original_file?: boolean;
  original_filename?: string;
  date?: string;
  name?: string;
  type?: "upload" | "paste";
  bookmarks?: string[];
  lookups?: { word: string; date: string }[];
}

export interface UserPreferences {
  theme?: "dark" | "light" | "sepia";
  fontSize?: "sm" | "base" | "lg" | "xl" | "custom";
  fontFamily?: "sans" | "serif" | "mono";
  targetLanguage?: string;
  translationEngine?: "google" | "gemini";
  hasDriveToken?: boolean;
  generateAudio?: boolean;
}

export interface CreditTransaction {
  id: number;
  amount: number;       // positive = top-up, negative = spend
  reason: string;
  session_id: string | null;
  date: string;
}

export interface CreditBalance {
  balance: number;
  history: CreditTransaction[];
}export interface LibrarySession {
  id: string;
  name: string;
  type: "upload" | "paste";
  date: string;
  bookmarks?: string[];
  lookups?: { word: string; date: string }[];
}
