export type RecordingStatus = 'recording' | 'processing' | 'ready' | 'failed';

export interface Recording {
  id: string;
  user_id: string;
  title: string;
  duration_seconds: number;
  audio_path: string | null;
  status: RecordingStatus;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}
