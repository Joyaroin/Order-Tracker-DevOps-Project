import { useState, useCallback } from 'react';

export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);

  const createOrder = useCallback(async ({ item, quantity }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, quantity }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { createOrder, submitting };
}

export function useDeleteOrder() {
  const [deletingId, setDeletingId] = useState(null);

  const deleteOrder = useCallback(async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/orders/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } finally {
      setDeletingId(null);
    }
  }, []);

  return { deleteOrder, deletingId };
}
