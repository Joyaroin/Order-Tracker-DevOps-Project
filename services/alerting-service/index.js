const express = require('express');
const app = express();
app.use(express.json());

const SERVICE_NAME = process.env.SERVICE_NAME || 'alerting-service';
const ENVIRONMENT = process.env.ENVIRONMENT || 'unknown';

const alerts = [];

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: SERVICE_NAME, 
    environment: ENVIRONMENT,
    alertCount: alerts.length 
  });
});

app.post('/alerts', (req, res) => {
  const alert = {
    id: `ALT-${Date.now()}`,
    type: req.body.type,
    orderId: req.body.orderId,
    item: req.body.item,
    receivedAt: new Date().toISOString(),
    environment: ENVIRONMENT
  };
  alerts.push(alert);
  console.log(`[${ENVIRONMENT}] Alert received: ${alert.type} for order ${alert.orderId}`);
  res.status(201).json(alert);
});

app.get('/alerts', (req, res) => {
  res.json({ environment: ENVIRONMENT, alerts });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[${ENVIRONMENT}] ${SERVICE_NAME} listening on port ${PORT}`);
});