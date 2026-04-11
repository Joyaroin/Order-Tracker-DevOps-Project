import { useState, useEffect, useRef, useCallback } from 'react';

export default function usePolling(url, intervalMs) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseTime, setResponseTime] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - start);
      setResponseTime(elapsed);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
      setResponseTime(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, intervalMs);
    return () => clearInterval(intervalRef.current);
  }, [fetchData, intervalMs]);

  return { data, error, loading, responseTime };
}
