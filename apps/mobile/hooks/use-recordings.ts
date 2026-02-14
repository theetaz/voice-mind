import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Recording } from '@voicemind/shared';

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setRecordings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const deleteRecording = useCallback(async (id: string) => {
    const { error } = await supabase.from('recordings').delete().eq('id', id);
    if (!error) setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recordings, loading, refresh: fetchRecordings, deleteRecording };
}
