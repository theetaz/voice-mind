import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET } from '@voicemind/shared';
import type { Recording } from '@voicemind/shared';

const PAGE_SIZE = 15;

export type RecordingWithMeta = Recording & {
  transcript_snippet?: string;
  has_summary?: boolean;
};

export function useRecordings(includeHidden = false) {
  const [recordings, setRecordings] = useState<RecordingWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const searchQueryRef = useRef<string | null>(null);

  const loadPage = useCallback(
    async (page: number, append: boolean, searchQuery?: string | null) => {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        if (searchQuery?.trim()) {
          const { data: session } = await supabase.auth.getSession();
          if (!session?.data?.session?.access_token) {
            setRecordings([]);
            return;
          }
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/search-recordings`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.data.session.access_token}`,
              },
              body: JSON.stringify({ query: searchQuery, limit: 50 }),
            },
          );
          const json = await res.json();
          if (json.error) throw new Error(json.error);
          const results = json.results ?? [];
          const withMeta: RecordingWithMeta[] = results.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            user_id: r.user_id as string,
            title: r.title as string,
            duration_seconds: (r.duration_seconds as number) ?? 0,
            audio_path: r.audio_path as string | null,
            status: r.status as string,
            file_size_bytes: (r.file_size_bytes as number) ?? 0,
            created_at: r.created_at as string,
            updated_at: r.updated_at as string,
            transcript_snippet: r.transcript_snippet as string,
            has_summary: false,
          }));
          const ids = withMeta.map((r) => r.id);
          if (ids.length > 0) {
            const { data: sums } = await supabase.from('summaries').select('recording_id').in('recording_id', ids);
            const sumSet = new Set((sums ?? []).map((s) => s.recording_id));
            withMeta.forEach((r) => { r.has_summary = sumSet.has(r.id); });
          }
          setRecordings(withMeta);
          setHasMore(false);
          return;
        }

        let q = supabase
          .from('recordings')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (!includeHidden) {
          q = q.or('is_hidden.is.null,is_hidden.eq.false');
        }
        const { data, error } = await q;
        if (error) throw error;
        const withMeta = await attachMeta(data ?? []);
        if (append) {
          setRecordings((prev) => {
            const seen = new Set(prev.map((r) => r.id));
            const newItems = withMeta.filter((r) => !seen.has(r.id));
            return [...prev, ...newItems];
          });
        } else {
          setRecordings(withMeta);
        }
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [includeHidden],
  );

  const fetchRecordings = useCallback(
    async (append = false, searchQuery?: string | null) => {
      const page = append ? pageRef.current : 0;
      if (!append) pageRef.current = 0;
      const q = searchQuery !== undefined ? searchQuery : searchQueryRef.current;
      if (searchQuery !== undefined) searchQueryRef.current = searchQuery;
      await loadPage(page, append, q);
      if (append) pageRef.current += 1;
    },
    [loadPage],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || searchQueryRef.current) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    loadPage(nextPage, true, null);
  }, [loadPage, loadingMore, hasMore]);

  useEffect(() => {
    fetchRecordings(false);
  }, [includeHidden]);

  const deleteRecording = useCallback(async (id: string) => {
    const target = recordings.find((r) => r.id === id);
    if (target?.audio_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([target.audio_path]);
    }
    const { error } = await supabase.from('recordings').delete().eq('id', id);
    if (!error) setRecordings((prev) => prev.filter((r) => r.id !== id));
  }, [recordings]);

  const refresh = useCallback(() => {
    pageRef.current = 0;
    fetchRecordings(false, searchQueryRef.current);
  }, [fetchRecordings]);

  const search = useCallback(
    (query: string) => {
      searchQueryRef.current = query?.trim() || null;
      pageRef.current = 0;
      fetchRecordings(false, searchQueryRef.current);
    },
    [fetchRecordings],
  );

  const clearSearch = useCallback(() => {
    searchQueryRef.current = null;
    pageRef.current = 0;
    fetchRecordings(false, null);
  }, [fetchRecordings]);

  return {
    recordings,
    loading,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    search,
    clearSearch,
    deleteRecording,
    refreshWithHidden: () => fetchRecordings(false, null),
  };
}

async function attachMeta(recordings: Recording[]): Promise<RecordingWithMeta[]> {
  if (recordings.length === 0) return [];
  const ids = recordings.map((r) => r.id);
  const [transRes, sumRes] = await Promise.all([
    supabase.from('transcripts').select('recording_id, full_text').in('recording_id', ids).eq('is_final', true),
    supabase.from('summaries').select('recording_id').in('recording_id', ids),
  ]);
  const transcriptMap = Object.fromEntries((transRes.data ?? []).map((t) => [t.recording_id, t.full_text?.slice(0, 150) ?? '']));
  const summaryIds = new Set((sumRes.data ?? []).map((s) => s.recording_id));
  return recordings.map((r) => ({
    ...r,
    transcript_snippet: transcriptMap[r.id],
    has_summary: summaryIds.has(r.id),
  }));
}
