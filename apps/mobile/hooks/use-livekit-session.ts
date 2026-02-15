import { useCallback, useRef, useState } from 'react';
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';
import { supabase } from '@/lib/supabase';
import { LIVEKIT_URL } from '@/lib/livekit';

export interface TranscriptSegment {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export function useLivekitSession() {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptSegment[]>([]);

  const connect = useCallback(async (roomName: string) => {
    try {
      // Get LiveKit token from edge function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      const res = await fetch(`${baseUrl}/functions/v1/livekit-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName }),
      });

      if (!res.ok) throw new Error('Failed to get LiveKit token');
      const { token: livekitToken } = await res.json();

      // Connect to room
      const room = new Room();
      roomRef.current = room;

      // Listen for data messages (transcripts from STT agent)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant, kind) => {
        try {
          const text = new TextDecoder().decode(payload);
          const data = JSON.parse(text);
          if (data.type === 'transcript') {
            setLiveTranscript((prev) => {
              if (data.isFinal) {
                return [...prev.filter((s) => s.isFinal), { text: data.text, isFinal: true, timestamp: Date.now() }];
              }
              // Replace the last interim segment
              const finals = prev.filter((s) => s.isFinal);
              return [...finals, { text: data.text, isFinal: false, timestamp: Date.now() }];
            });
          }
        } catch {
          // Not JSON or not a transcript message
        }
      });

      await room.connect(LIVEKIT_URL, livekitToken);
      await room.localParticipant.setMicrophoneEnabled(true);
      setConnected(true);
    } catch (e) {
      console.error('LiveKit connection error:', e);
      setConnected(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    setConnected(false);
  }, []);

  const getFullTranscript = useCallback(() => {
    return liveTranscript
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join(' ');
  }, [liveTranscript]);

  return {
    connect,
    disconnect,
    connected,
    liveTranscript,
    getFullTranscript,
    clearTranscript: () => setLiveTranscript([]),
  };
}
