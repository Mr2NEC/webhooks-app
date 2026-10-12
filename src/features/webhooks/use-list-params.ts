import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseListParams, serializeListParams } from './list-params';
import type { WebhookListParams } from './types';

export function useListParams(): {
  params: WebhookListParams;
  setPage: (page: number, options?: { replace?: boolean }) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseListParams(searchParams), [searchParams]);

  useEffect(() => {
    const canonical = serializeListParams(params);
    if (canonical.toString() !== searchParams.toString()) setSearchParams(canonical, { replace: true });
  }, [params, searchParams, setSearchParams]);

  const setPage = useCallback(
    (page: number, options?: { replace?: boolean }) => {
      setSearchParams((prev) => serializeListParams({ ...parseListParams(prev), page }), options);
    },
    [setSearchParams],
  );

  const setLimit = useCallback(
    (limit: number) => {
      setSearchParams((prev) => serializeListParams({ ...parseListParams(prev), page: 1, limit }));
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (search: string) => {
      setSearchParams((prev) =>
        serializeListParams({ ...parseListParams(prev), page: 1, search: search.trim() }),
      );
    },
    [setSearchParams],
  );

  return { params, setPage, setLimit, setSearch };
}
