const express = require('express');
const { pool } = require('./db');
const queries = require('./queries');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'order-api';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';

queries
  .ping()
  .then(() => console.log(`[${ENVIRONMENT}] PostgreSQL connected`))
  .catch((err) => console.error(`[${ENVIRONMENT}] PostgreSQL failed: ${err.message}`));

app.get('/health', async (req, res) => {
  let dbHealthy = true;
  try {
    await queries.ping();
  } catch {
    dbHealthy = false;
  }

  const orderCount = await queries.countOrders().catch(() => 0);

  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    dbConnected: dbHealthy,
    orderCount,
  });
});

app.post('/orders', async (req, res) => {
  try {
    const order = await queries.createOrderWithAlert({
      id: `ORD-${Date.now()}`,
      item: req.body.item,
      quantity: req.body.quantity,
      environment: ENVIRONMENT,
      alertId: `ALT-${Date.now()}`,
    });
    console.log(`[${ENVIRONMENT}] Order ${order.id} saved and alert created`);
    return res.status(201).json(order);
  } catch (err) {
    console.error(`[${ENVIRONMENT}] DB insert failed: ${err.message}`);
    return res.status(500).json({ error: 'Failed to save order' });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const orders = await queries.listOrders();
    return res.json({ environment: ENVIRONMENT, orders });
  } catch (err) {
    console.error(`[${ENVIRONMENT}] Failed to fetch orders: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.delete('/orders/:id', async (req, res) => {
  try {
    const order = await queries.deleteOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.log(`[${ENVIRONMENT}] Order ${order.id} deleted`);
    return res.json(order);
  } catch (err) {
    console.error(`[${ENVIRONMENT}] Failed to delete order: ${err.message}`);
    return res.status(500).json({ error: 'Failed to delete order' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => pool.end());
});
