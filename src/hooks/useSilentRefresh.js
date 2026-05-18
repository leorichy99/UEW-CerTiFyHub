import { useCallback, useRef, useState } from "react";

/**
 * useSilentRefresh — coordinates a fetcher with two distinct loading states:
 *   - initialLoading: true only on first run (use to gate full-page skeletons)
 *   - refreshing:     true on subsequent runs (use to gate inline shimmers)
 *
 * Usage:
 *   const { initialLoading, refreshing, refresh, run } = useSilentRefresh(fetcher);
 *   useEffect(() => { run(); }, [run]);
 *   <RefreshButton onClick={refresh} spinning={refreshing} />
 */
export default function useSilentRefresh(fetcher) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasRunRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (...args) => {
    const isFirst = !hasRunRef.current;
    hasRunRef.current = true;
    if (isFirst) setInitialLoading(true);
    else setRefreshing(true);
    try {
      return await fetcherRef.current?.(...args);
    } finally {
      if (isFirst) setInitialLoading(false);
      else setRefreshing(false);
    }
  }, []);

  const refresh = useCallback((...args) => run(...args), [run]);

  return { initialLoading, refreshing, run, refresh };
}
