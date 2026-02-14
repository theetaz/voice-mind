export * from './user';
export * from './recording';
export * from './transcript';

export interface Summary {
  id: string;
  recording_id: string;
  content: string;
  key_points: string[];
  model: string;
  created_at: string;
}
