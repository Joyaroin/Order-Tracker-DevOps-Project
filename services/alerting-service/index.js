const express = require('express');
const { Kafka, logLevel } = require('kafkajs');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'alerting-service';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || `orders-${ENVIRONMENT}`;
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || `alerting-service-${ENVIRONMENT}`;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'ordertracker',
  password: process.env.DB_PASSWORD || 'devpassword123',
  database: process.env.DB_NAME || 'ordertracker',
});

const kafka = new Kafka({
  clientId: `alerting-service-${ENVIRONMENT}`,
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.NOTHING,
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
let consumerReady = false;
let consumerStarted = false;
let restartTimer = null;

function scheduleConsumerRestart() {
  if (restartTimer) return;
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startConsumer();
  }, 5000);
}

async function startConsumer() {
  if (consumerStarted) return;
  consumerStarted = true;

  try {
    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
    consumerReady = true;

    console.log(
      `[${ENVIRONMENT}] Kafka consumer connected, topic: ${KAFKA_TOPIC}, group: ${KAFKA_GROUP_ID}`
    );

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());

        try {
          await pool.query(
            `INSERT INTO alerts (id, type, order_id, item, environment, source)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              `ALT-${Date.now()}`,
              event.type,
              event.orderId,
              event.item,
              ENVIRONMENT,
              `${topic} (partition ${partition})`,
            ]
          );
          console.log(
            `[${ENVIRONMENT}] Alert saved: ${event.type} for order ${event.orderId} via ${topic}`
          );
        } catch (err) {
          console.error(`[${ENVIRONMENT}] Alert DB insert failed: ${err.message}`);
        }
      },
    });
  } catch (err) {
    consumerReady = false;
    console.error(`[${ENVIRONMENT}] Kafka consumer connection failed: ${err.message}`);
    try {
      await consumer.disconnect();
    } catch (disconnectErr) {
      console.error(
        `[${ENVIRONMENT}] Kafka consumer disconnect cleanup failed: ${disconnectErr.message}`
      );
    }
    consumerStarted = false;
    scheduleConsumerRestart();
  }
}

consumer.on(consumer.events.CRASH, () => {
  consumerReady = false;
  consumerStarted = false;
  scheduleConsumerRestart();
});

consumer.on(consumer.events.DISCONNECT, () => {
  consumerReady = false;
  consumerStarted = false;
});

startConsumer();

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
    status: dbHealthy && consumerReady ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    kafkaConnected: consumerReady,
    kafkaTopic: KAFKA_TOPIC,
    kafkaGroupId: KAFKA_GROUP_ID,
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
