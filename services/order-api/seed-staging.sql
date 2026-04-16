INSERT INTO orders (id, item, quantity, environment, created_at)
VALUES
  ('ORD-STG-1001', 'laptop stand', 3, 'staging', '2026-04-16 10:00:00'),
  ('ORD-STG-1002', 'noise-cancelling headset', 1, 'staging', '2026-04-16 10:20:00'),
  ('ORD-STG-1003', 'webcam light', 4, 'staging', '2026-04-16 10:40:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (id, type, order_id, item, environment, source, received_at)
VALUES
  ('ALT-STG-2001', 'NEW_ORDER', 'ORD-STG-1001', 'laptop stand', 'staging', 'orders-staging (partition 0)', '2026-04-16 10:00:03'),
  ('ALT-STG-2002', 'NEW_ORDER', 'ORD-STG-1002', 'noise-cancelling headset', 'staging', 'orders-staging (partition 0)', '2026-04-16 10:20:05'),
  ('ALT-STG-2003', 'NEW_ORDER', 'ORD-STG-1003', 'webcam light', 'staging', 'orders-staging (partition 0)', '2026-04-16 10:40:04')
ON CONFLICT (id) DO NOTHING;
