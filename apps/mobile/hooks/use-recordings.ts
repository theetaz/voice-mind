import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET } from '@voicemind/shared';
import type { Recording } from '@voicemind/shared';

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = useCallback(async (includeHidden = false) => {
    setLoading(true);
    let q = supabase.from('recordings').select('*').order('created_at', { ascending: false });
    if (!includeHidden) {
      q = q.or('is_hidden.is.null,is_hidden.eq.false');
    }
    const { data, error } = await q;
    if (!error && data) setRecordings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const deleteRecording = useCallback(async (id: string) => {
    const target = recordings.find((r) => r.id === id);
    // Delete from storage if audio exists
    if (target?.audio_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([target.audio_path]);
    }
    // Delete related data (cascades via FK) and the recording itself
    const { error } = await supabase.from('recordings').delete().eq('id', id);
    if (!error) setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, [recordings]);

  return { recordings, loading, refresh: () => fetchRecordings(false), refreshWithHidden: () => fetchRecordings(true), deleteRecording };
}
