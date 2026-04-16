const express = require('express');
const { Kafka, logLevel } = require('kafkajs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'order-api';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || `orders-${ENVIRONMENT}`;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'ordertracker',
  password: process.env.DB_PASSWORD || 'devpassword123',
  database: process.env.DB_NAME || 'ordertracker',
});

const kafka = new Kafka({
  clientId: `order-api-${ENVIRONMENT}`,
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.NOTHING,
});

const producer = kafka.producer();
let producerReady = false;
let reconnectTimer = null;

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectProducer();
  }, 5000);
}

async function connectProducer() {
  try {
    await producer.connect();
    producerReady = true;
    console.log(`[${ENVIRONMENT}] Kafka producer connected, topic: ${KAFKA_TOPIC}`);
  } catch (err) {
    producerReady = false;
    console.error(`[${ENVIRONMENT}] Kafka producer connection failed: ${err.message}`);
    scheduleReconnect();
  }
}

producer.on(producer.events.DISCONNECT, () => {
  producerReady = false;
  console.log(`[${ENVIRONMENT}] Kafka producer disconnected`);
  scheduleReconnect();
});

producer.on(producer.events.REQUEST_TIMEOUT, () => {
  producerReady = false;
});

connectProducer();

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
    status: dbHealthy && producerReady ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    kafkaConnected: producerReady,
    kafkaTopic: KAFKA_TOPIC,
    dbConnected: dbHealthy,
    orderCount: Number.parseInt(countResult.rows[0].count, 10),
  });
});

app.post('/orders', async (req, res) => {
  const orderId = `ORD-${Date.now()}`;

  try {
    const result = await pool.query(
      `INSERT INTO orders (id, item, quantity, environment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, item, quantity, environment, created_at AS "createdAt"`,
      [orderId, req.body.item, req.body.quantity, ENVIRONMENT]
    );

    const order = result.rows[0];

    if (producerReady) {
      try {
        await producer.send({
          topic: KAFKA_TOPIC,
          messages: [
            {
              key: order.id,
              value: JSON.stringify({
                type: 'NEW_ORDER',
                orderId: order.id,
                item: order.item,
                quantity: order.quantity,
                environment: ENVIRONMENT,
                timestamp: order.createdAt,
              }),
            },
          ],
        });
        console.log(`[${ENVIRONMENT}] Order ${order.id} saved and published to ${KAFKA_TOPIC}`);
      } catch (err) {
        producerReady = false;
        console.error(`[${ENVIRONMENT}] Kafka publish failed: ${err.message}`);
        scheduleReconnect();
      }
    } else {
      console.log(`[${ENVIRONMENT}] Order ${order.id} saved (Kafka not connected)`);
    }

    return res.status(201).json(order);
  } catch (err) {
    console.error(`[${ENVIRONMENT}] DB insert failed: ${err.message}`);
    return res.status(500).json({ error: 'Failed to save order' });
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
