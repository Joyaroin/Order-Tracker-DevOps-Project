const { pool } = require('./db');

async function ping() {
  await pool.query('SELECT 1');
}

async function countOrders() {
  const result = await pool.query('SELECT COUNT(*) FROM orders');
  return Number.parseInt(result.rows[0].count, 10);
}

async function listOrders() {
  const result = await pool.query(
    `SELECT id, item, quantity, environment, created_at AS "createdAt"
     FROM orders
     ORDER BY created_at DESC`
  );
  return result.rows;
}

async function createOrderWithAlert({ id, item, quantity, environment, alertId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (id, item, quantity, environment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, item, quantity, environment, created_at AS "createdAt"`,
      [id, item, quantity, environment]
    );
    const order = orderResult.rows[0];

    await client.query(
      `INSERT INTO alerts (id, type, order_id, item, environment, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [alertId, 'NEW_ORDER', order.id, order.item, environment, 'order-api']
    );

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function deleteOrder(id) {
  const result = await pool.query(
    `DELETE FROM orders
     WHERE id = $1
     RETURNING id, item, quantity, environment, created_at AS "createdAt"`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  ping,
  countOrders,
  listOrders,
  createOrderWithAlert,
  deleteOrder,
};
