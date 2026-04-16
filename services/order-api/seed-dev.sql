INSERT INTO orders (id, item, quantity, environment, created_at)
VALUES
  ('ORD-DEV-1001', 'mechanical keyboard', 1, 'dev', '2026-04-16 09:00:00'),
  ('ORD-DEV-1002', 'usb-c dock', 2, 'dev', '2026-04-16 09:15:00'),
  ('ORD-DEV-1003', 'monitor arm', 1, 'dev', '2026-04-16 09:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (id, type, order_id, item, environment, source, received_at)
VALUES
  ('ALT-DEV-2001', 'NEW_ORDER', 'ORD-DEV-1001', 'mechanical keyboard', 'dev', 'orders-dev (partition 0)', '2026-04-16 09:00:05'),
  ('ALT-DEV-2002', 'NEW_ORDER', 'ORD-DEV-1002', 'usb-c dock', 'dev', 'orders-dev (partition 0)', '2026-04-16 09:15:04'),
  ('ALT-DEV-2003', 'NEW_ORDER', 'ORD-DEV-1003', 'monitor arm', 'dev', 'orders-dev (partition 0)', '2026-04-16 09:30:06')
ON CONFLICT (id) DO NOTHING;
