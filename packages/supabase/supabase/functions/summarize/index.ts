import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendExpoPush } from '../_shared/push.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI assistant that summarizes voice memos. Given a transcript, provide:
1. A concise summary (2-4 sentences)
2. A list of key points (3-7 bullet points)

Respond in JSON format: { "summary": "...", "key_points": ["...", "..."] }`;

async function runSummarization(recordingId: string) {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: transcript, error: tErr } = await supabaseAdmin
      .from('transcripts')
      .select('full_text')
      .eq('recording_id', recordingId)
      .eq('is_final', true)
      .single();

    if (tErr || !transcript?.full_text) {
      await supabaseAdmin.from('recordings').update({ status: 'failed' }).eq('id', recordingId);
      return;
    }

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcript.full_text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!gptRes.ok) {
      throw new Error(`OpenAI API error: ${await gptRes.text()}`);
    }

    const gptData = await gptRes.json();
    const result = JSON.parse(gptData.choices[0].message.content);

    await supabaseAdmin.from('summaries').upsert(
      {
        recording_id: recordingId,
        content: result.summary,
        key_points: result.key_points,
        model: 'gpt-4o-mini',
      },
      { onConflict: 'recording_id' },
    );

    await supabaseAdmin
      .from('recordings')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', recordingId);

    const { data: recording } = await supabaseAdmin
      .from('recordings')
      .select('user_id')
      .eq('id', recordingId)
      .single();
    if (recording) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('expo_push_token')
        .eq('id', recording.user_id)
        .single();
      await sendExpoPush(profile?.expo_push_token ?? null, 'VoiceMind', 'Your summary is ready.');
    }
  } catch {
    await supabaseAdmin.from('recordings').update({ status: 'failed' }).eq('id', recordingId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { recordingId } = await req.json();
    if (!recordingId) {
      return new Response(JSON.stringify({ error: 'recordingId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    runSummarization(recordingId);

    return new Response(
      JSON.stringify({ accepted: true, message: 'Summarization started' }),
      {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
