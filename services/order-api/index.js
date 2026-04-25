const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'order-api';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'ordertracker',
  password: process.env.DB_PASSWORD || 'devpassword123',
  database: process.env.DB_NAME || 'ordertracker',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool
  .query('SELECT NOW()')
  .then(() => console.log(`[${ENVIRONMENT}] PostgreSQL connected`))
  .catch((err) => console.error(`[${ENVIRONMENT}] PostgreSQL failed: ${err.message}`));

async function getDbHealth() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

app.get('/health', async (req, res) => {
  const dbHealthy = await getDbHealth();
  const countResult = await pool
    .query('SELECT COUNT(*) FROM orders')
    .catch(() => ({ rows: [{ count: '0' }] }));

  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    dbConnected: dbHealthy,
    orderCount: Number.parseInt(countResult.rows[0].count, 10),
  });
});

app.post('/orders', async (req, res) => {
  const orderId = `ORD-${Date.now()}`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO orders (id, item, quantity, environment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, item, quantity, environment, created_at AS "createdAt"`,
      [orderId, req.body.item, req.body.quantity, ENVIRONMENT]
    );

    const order = result.rows[0];

    await client.query(
      `INSERT INTO alerts (id, type, order_id, item, environment, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`ALT-${Date.now()}`, 'NEW_ORDER', order.id, order.item, ENVIRONMENT, 'order-api']
    );

    await client.query('COMMIT');
    console.log(`[${ENVIRONMENT}] Order ${order.id} saved and alert created`);

    return res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[${ENVIRONMENT}] DB insert failed: ${err.message}`);
    return res.status(500).json({ error: 'Failed to save order' });
  } finally {
    client.release();
  }
});

app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, item, quantity, environment, created_at AS "createdAt" FROM orders ORDER BY created_at DESC'
    );
    return res.json({ environment: ENVIRONMENT, orders: result.rows });
  } catch (err) {
    console.error(`[${ENVIRONMENT}] Failed to fetch orders: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.delete('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 RETURNING id, item, quantity, environment, created_at AS "createdAt"',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`[${ENVIRONMENT}] Order ${req.params.id} deleted`);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(`[${ENVIRONMENT}] Failed to delete order: ${err.message}`);
    return res.status(500).json({ error: 'Failed to delete order' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});
