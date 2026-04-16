const express = require('express');
const { Kafka, logLevel } = require('kafkajs');

const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'order-api';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || `orders-${ENVIRONMENT}`;

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

const orders = [];

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    kafkaConnected: producerReady,
    kafkaTopic: KAFKA_TOPIC,
    orderCount: orders.length,
  });
});

app.post('/orders', async (req, res) => {
  const order = {
    id: `ORD-${Date.now()}`,
    item: req.body.item,
    quantity: req.body.quantity,
    createdAt: new Date().toISOString(),
    environment: ENVIRONMENT,
  };
  orders.push(order);

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
      console.log(`[${ENVIRONMENT}] Order ${order.id} published to ${KAFKA_TOPIC}`);
    } catch (err) {
      producerReady = false;
      console.error(`[${ENVIRONMENT}] Failed to publish to Kafka: ${err.message}`);
      scheduleReconnect();
    }
  } else {
    console.log(`[${ENVIRONMENT}] Order ${order.id} created (Kafka not connected)`);
  }

  res.status(201).json(order);
});

app.get('/orders', (req, res) => {
  res.json({ environment: ENVIRONMENT, orders });
});

app.delete('/orders/:id', (req, res) => {
  const index = orders.findIndex((order) => order.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const [removed] = orders.splice(index, 1);
  console.log(`[${ENVIRONMENT}] Order ${removed.id} deleted`);
  return res.json(removed);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});
