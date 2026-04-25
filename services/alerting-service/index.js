const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'alerting-service';
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
    .query('SELECT COUNT(*) FROM alerts')
    .catch(() => ({ rows: [{ count: '0' }] }));

  res.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    dbConnected: dbHealthy,
    alertCount: Number.parseInt(countResult.rows[0].count, 10),
  });
});

app.post('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO alerts (id, type, order_id, item, environment, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type, order_id AS "orderId", item, environment, source, received_at AS "receivedAt"`,
      [
        `ALT-${Date.now()}`,
        req.body.type,
        req.body.orderId,
        req.body.item,
        ENVIRONMENT,
        'HTTP',
      ]
    );

    console.log(`[${ENVIRONMENT}] Alert via HTTP: ${req.body.type} for order ${req.body.orderId}`);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(`[${ENVIRONMENT}] Failed to save HTTP alert: ${err.message}`);
    return res.status(500).json({ error: 'Failed to save alert' });
  }
});

app.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, order_id AS "orderId", item, environment, source, received_at AS "receivedAt"
       FROM alerts
       ORDER BY received_at DESC`
    );
    return res.json({ environment: ENVIRONMENT, alerts: result.rows });
  } catch (err) {
    console.error(`[${ENVIRONMENT}] Failed to fetch alerts: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});
