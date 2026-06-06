import { useState } from 'react';
import { useCreateOrder } from '../hooks/useOrderMutations';

export default function CreateOrderForm({ onSuccess, onError }) {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const { createOrder, submitting } = useCreateOrder();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item.trim() || !quantity) return;

    try {
      const order = await createOrder({
        item: item.trim(),
        quantity: parseInt(quantity, 10),
      });
      setItem('');
      setQuantity('');
      onSuccess(`Order ${order.id} created`);
    } catch (err) {
      onError(`Failed to create order: ${err.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-sm font-semibold text-warm-gray uppercase tracking-wide mb-4">
        Create Order
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="item" className="block text-sm text-warm-gray mb-1">
            Item Name
          </label>
          <input
            id="item"
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. Widget"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 focus:border-maroon"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm text-warm-gray mb-1">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 focus:border-maroon"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-maroon text-white text-sm font-medium py-2 px-4 rounded hover:bg-maroon-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
