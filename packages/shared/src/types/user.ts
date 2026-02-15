export interface User {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  transcription_enabled?: boolean;
  summarization_enabled?: boolean;
  expo_push_token?: string | null;
  created_at: string;
  updated_at: string;
}
