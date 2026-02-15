import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch recording
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

    // Download audio from storage
    const { data: audioData, error: dlError } = await supabaseAdmin.storage
      .from('recordings')
      .download(recording.audio_path);
    if (dlError || !audioData) {
      return new Response(JSON.stringify({ error: 'Failed to download audio' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send to OpenAI Whisper API with word timestamps
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

    const words = (whisperData.words ?? []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: 1.0,
    }));

    // Upsert transcript
    await supabaseAdmin.from('transcripts').upsert(
      {
        recording_id: recordingId,
        full_text: whisperData.text,
        words,
        language: whisperData.language ?? 'en',
        provider: 'whisper',
        is_final: true,
      },
      { onConflict: 'recording_id' },
    );

    // Update recording status
    await supabaseAdmin
      .from('recordings')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', recordingId);

    return new Response(JSON.stringify({ success: true, text: whisperData.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
