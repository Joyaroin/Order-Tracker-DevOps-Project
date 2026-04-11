import usePolling from '../hooks/usePolling';

export default function OrdersList() {
  const { data, error, loading } = usePolling('/api/orders/orders', 5000);
  const orders = data?.orders ? [...data.orders].reverse() : [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-4">
        Orders
        {orders.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">({orders.length})</span>
        )}
      </h2>

      {error && !data && (
        <p className="text-sm text-red-500">Failed to load orders: {error}</p>
      )}
      {error && data && (
        <p className="text-xs text-amber-600 mb-3">Failed to refresh</p>
      )}

      {loading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No orders yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b">
                <th className="pb-2 pr-4">ID</th>
                <th className="pb-2 pr-4">Item</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2">Env</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="text-warm-gray">
                  <td className="py-2 pr-4 font-mono text-xs">{order.id}</td>
                  <td className="py-2 pr-4">{order.item}</td>
                  <td className="py-2 pr-4">{order.quantity}</td>
                  <td className="py-2 pr-4 text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span className="inline-block bg-beige text-warm-gray text-xs px-2 py-0.5 rounded">
                      {order.environment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
