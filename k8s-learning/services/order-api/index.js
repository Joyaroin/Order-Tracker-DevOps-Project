const express = require('express');
const app = express();
app.use(express.json());

// Read config from environment variables (injected by ConfigMap)
const SERVICE_NAME = process.env.SERVICE_NAME || 'order-api';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';
const ALERTING_SERVICE_URL = process.env.ALERTING_SERVICE_URL || 'http://localhost:3001';

// In-memory store (Phase 1 only — Phase 3 replaces with Postgres)
const orders = [];

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: SERVICE_NAME, 
    environment: ENVIRONMENT,
    orderCount: orders.length 
  });
});

app.post('/orders', async (req, res) => {
  const order = {
    id: `ORD-${Date.now()}`,
    item: req.body.item,
    quantity: req.body.quantity,
    createdAt: new Date().toISOString(),
    environment: ENVIRONMENT
  };
  orders.push(order);

  // Notify alerting service (direct HTTP for now — Dapr replaces this in Phase 4)
  try {
    await fetch(`${ALERTING_SERVICE_URL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'NEW_ORDER', 
        orderId: order.id, 
        item: order.item 
      })
    });
    console.log(`[${ENVIRONMENT}] Order ${order.id} created, alert sent`);
  } catch (err) {
    console.log(`[${ENVIRONMENT}] Order ${order.id} created, alert failed: ${err.message}`);
  }

  res.status(201).json(order);
});

app.get('/orders', (req, res) => {
  res.json({ environment: ENVIRONMENT, orders });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});