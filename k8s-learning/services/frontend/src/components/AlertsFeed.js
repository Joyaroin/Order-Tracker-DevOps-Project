import { useRef, useState, useEffect, useMemo } from 'react';
import usePolling from '../hooks/usePolling';

export default function AlertsFeed() {
  const { data, error, loading } = usePolling('/api/alerts/alerts', 5000);
  const alerts = useMemo(
    () => (data?.alerts ? [...data.alerts].reverse() : []),
    [data]
  );
  const seenIds = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());

  useEffect(() => {
    if (!alerts.length) return;

    const fresh = new Set();
    for (const alert of alerts) {
      if (!seenIds.current.has(alert.id)) {
        fresh.add(alert.id);
        seenIds.current.add(alert.id);
      }
    }

    if (fresh.size > 0) {
      setNewIds(fresh);
      const timer = setTimeout(() => setNewIds(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [alerts]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-4">
        Alerts Feed
        {alerts.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">({alerts.length})</span>
        )}
      </h2>

      {error && !data && (
        <p className="text-sm text-red-500">Failed to load alerts: {error}</p>
      )}
      {error && data && (
        <p className="text-xs text-amber-600 mb-3">Failed to refresh</p>
      )}

      {loading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No alerts yet</p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border border-gray-100 rounded-lg p-3 transition-colors ${
                newIds.has(alert.id) ? 'animate-highlight' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block bg-deep-red text-white text-xs font-medium px-2 py-0.5 rounded">
                  {alert.type}
                </span>
                <span className="text-xs text-gray-400 font-mono">{alert.orderId}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-warm-gray">{alert.item}</p>
                <p className="text-xs text-gray-400">
                  {new Date(alert.receivedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
