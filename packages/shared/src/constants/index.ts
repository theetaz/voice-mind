export const APP_NAME = 'VoiceMind';
export const APP_SCHEME = 'voicemind';

export const RECORDING_STATUS = {
  RECORDING: 'recording',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const STORAGE_BUCKET = 'recordings';

export const SUPPORTED_AUDIO_FORMAT = 'm4a';
export const MAX_RECORDING_DURATION_SECONDS = 3600; // 1 hour
