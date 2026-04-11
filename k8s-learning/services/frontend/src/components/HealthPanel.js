import usePolling from '../hooks/usePolling';

function HealthIndicator({ name, url }) {
  const { data, error, loading, responseTime } = usePolling(url, 10000);
  const isHealthy = data && !error;

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-block h-3 w-3 rounded-full ${
          loading
            ? 'bg-gray-300 animate-pulse'
            : isHealthy
            ? 'bg-green-500'
            : 'bg-red-500'
        }`}
      />
      <div>
        <p className="text-sm font-medium text-warm-gray">{name}</p>
        <p className="text-xs text-gray-400">
          {loading
            ? 'Checking...'
            : isHealthy
            ? `Healthy · ${responseTime}ms`
            : `Unreachable${error ? ` · ${error}` : ''}`}
        </p>
      </div>
    </div>
  );
}

export default function HealthPanel() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-4">
        Service Health
      </h2>
      <div className="flex flex-wrap gap-8">
        <HealthIndicator name="Order API" url="/api/orders/health" />
        <HealthIndicator name="Alerting Service" url="/api/alerts/health" />
      </div>
    </div>
  );
}
