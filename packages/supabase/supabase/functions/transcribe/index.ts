import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/push.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 16000),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings error: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { recordingId } = await req.json();
    if (!recordingId) {
      return new Response(JSON.stringify({ error: 'recordingId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: recording, error: recError } = await supabaseAdmin
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();
    if (recError || !recording) {
      return new Response(JSON.stringify({ error: 'Recording not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('expo_push_token, summarization_enabled')
      .eq('id', recording.user_id)
      .single();
    const pushToken = profile?.expo_push_token ?? null;
    const summarizationEnabled = profile?.summarization_enabled !== false;

    await sendExpoPush(pushToken, 'VoiceMind', "Transcription in progress. We'll notify you when it's ready.");

    const { data: audioData, error: dlError } = await supabaseAdmin.storage
      .from('recordings')
      .download(recording.audio_path);
    if (dlError || !audioData) {
      return new Response(JSON.stringify({ error: 'Failed to download audio' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = new FormData();
    formData.append('file', audioData, 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      throw new Error(`Whisper API error: ${errText}`);
    }

    const whisperData = await whisperRes.json();
    const text = whisperData.text || '';

    const words = (whisperData.words ?? []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: 1.0,
    }));

    let embedding: number[] | null = null;
    if (text.length > 0) {
      try {
        embedding = await getEmbedding(text);
      } catch {
        // Continue without embedding
      }
    }

    await supabaseAdmin.from('transcripts').upsert(
      {
        recording_id: recordingId,
        full_text: text,
        words,
        language: whisperData.language ?? 'en',
        provider: 'whisper',
        is_final: true,
        ...(embedding && { embedding }),
      },
      { onConflict: 'recording_id' },
    );

    await supabaseAdmin
      .from('recordings')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', recordingId);

    if (!summarizationEnabled) {
      await sendExpoPush(pushToken, 'VoiceMind', 'Your recording is ready.');
    }

    return new Response(JSON.stringify({ success: true, text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
