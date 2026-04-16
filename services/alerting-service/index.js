const express = require('express');
const { Kafka, logLevel } = require('kafkajs');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'alerting-service';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || `orders-${ENVIRONMENT}`;
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || `alerting-service-${ENVIRONMENT}`;

const kafka = new Kafka({
  clientId: `alerting-service-${ENVIRONMENT}`,
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.NOTHING,
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
const alerts = [];
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
        const alert = {
          id: `ALT-${Date.now()}`,
          type: event.type,
          orderId: event.orderId,
          item: event.item,
          receivedAt: new Date().toISOString(),
          environment: ENVIRONMENT,
          source: `${topic} (partition ${partition})`,
        };
        alerts.push(alert);
        console.log(
          `[${ENVIRONMENT}] Alert from Kafka: ${alert.type} for order ${alert.orderId} via ${topic}`
        );
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

consumer.on(consumer.events.CRASH, async () => {
  consumerReady = false;
  consumerStarted = false;
  scheduleConsumerRestart();
});

consumer.on(consumer.events.DISCONNECT, () => {
  consumerReady = false;
  consumerStarted = false;
});

startConsumer();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    kafkaConnected: consumerReady,
    kafkaTopic: KAFKA_TOPIC,
    kafkaGroupId: KAFKA_GROUP_ID,
    alertCount: alerts.length,
  });
});

app.post('/alerts', (req, res) => {
  const alert = {
    id: `ALT-${Date.now()}`,
    type: req.body.type,
    orderId: req.body.orderId,
    item: req.body.item,
    receivedAt: new Date().toISOString(),
    environment: ENVIRONMENT,
    source: 'HTTP',
  };
  alerts.push(alert);
  console.log(`[${ENVIRONMENT}] Alert via HTTP: ${alert.type} for order ${alert.orderId}`);
  res.status(201).json(alert);
});

app.get('/alerts', (req, res) => {
  res.json({ environment: ENVIRONMENT, alerts });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});
