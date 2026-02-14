export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptSegment {
  id: string;
  recording_id: string;
  text: string;
  start: number;
  end: number;
  words: TranscriptWord[];
}

export type TranscriptProvider = 'deepgram' | 'whisper';

export interface Transcript {
  id: string;
  recording_id: string;
  full_text: string;
  words: TranscriptWord[];
  language: string;
  provider: TranscriptProvider;
  is_final: boolean;
  created_at: string;
  updated_at: string;
}
