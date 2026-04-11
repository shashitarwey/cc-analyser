const request = require('supertest');
const app = require('../app');
const { createTestUser, authHeader } = require('./helpers');
require('./setup');

describe('Customers (Khata) Routes', () => {
  let token;

  beforeEach(async () => {
    const testUser = await createTestUser();
    token = testUser.token;
  });

  // ── Customer CRUD ─────────────────────────────────────────────────────────
  describe('POST /api/customers', () => {
    it('should create a customer with name only', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set(authHeader(token))
        .send({ name: 'Ravi Kumar' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Ravi Kumar');
      expect(res.body.phone).toBe('');
      expect(res.body.notes).toBe('');
    });

    it('should create a customer with phone and notes', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set(authHeader(token))
        .send({ name: 'Amit', phone: '9876543210', notes: 'College friend' });
      expect(res.status).toBe(201);
      expect(res.body.phone).toBe('9876543210');
      expect(res.body.notes).toBe('College friend');
    });

    it('should reject when name is missing', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set(authHeader(token))
        .send({ phone: '1234567890' });
      expect(res.status).toBe(400);
    });

    it('should reject when name is only whitespace', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set(authHeader(token))
        .send({ name: '   ' });
      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/customers')
        .send({ name: 'Noauth' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/customers', () => {
    it('should return empty list for a new user', async () => {
      const res = await request(app).get('/api/customers').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.page.item_total).toBe(0);
    });

    it('should return customers with computed totals (zero entries)', async () => {
      await request(app).post('/api/customers').set(authHeader(token)).send({ name: 'A' });
      const res = await request(app).get('/api/customers').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        name: 'A',
        total_gave: 0,
        total_got: 0,
        balance: 0,
      });
    });

    it('should compute correct aggregated totals with entries', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Debtor' });

      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 1000, entry_date: '2026-04-01' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 500, entry_date: '2026-04-02' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'got', amount: 300, entry_date: '2026-04-03' });

      const res = await request(app).get('/api/customers').set(authHeader(token));
      expect(res.body.items[0].total_gave).toBe(1500);
      expect(res.body.items[0].total_got).toBe(300);
      expect(res.body.items[0].balance).toBe(1200);
    });

    it('should support all=true for dropdowns (returns array)', async () => {
      await request(app).post('/api/customers').set(authHeader(token)).send({ name: 'X' });
      await request(app).post('/api/customers').set(authHeader(token)).send({ name: 'Y' });
      const res = await request(app).get('/api/customers?all=true').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('should not leak other users customers', async () => {
      const other = await createTestUser({ email: 'other@example.com' });
      await request(app).post('/api/customers').set(authHeader(other.token)).send({ name: 'Theirs' });
      const res = await request(app).get('/api/customers').set(authHeader(token));
      expect(res.body.items).toHaveLength(0);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should return a single customer with totals', async () => {
      const created = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Single' });
      const res = await request(app)
        .get(`/api/customers/${created.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Single');
      expect(res.body).toHaveProperty('total_gave', 0);
      expect(res.body).toHaveProperty('total_got', 0);
      expect(res.body).toHaveProperty('balance', 0);
    });

    it('should return 404 for non-existent customer', async () => {
      const res = await request(app)
        .get('/api/customers/000000000000000000000000')
        .set(authHeader(token));
      expect(res.status).toBe(404);
    });

    it('should reject invalid mongoId', async () => {
      const res = await request(app)
        .get('/api/customers/not-a-mongoid')
        .set(authHeader(token));
      expect(res.status).toBe(400);
    });

    it('should not expose another users customer', async () => {
      const other = await createTestUser({ email: 'other@example.com' });
      const theirs = await request(app).post('/api/customers').set(authHeader(other.token))
        .send({ name: 'Private' });
      const res = await request(app)
        .get(`/api/customers/${theirs.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update name, phone, notes', async () => {
      const created = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Old' });
      const res = await request(app)
        .put(`/api/customers/${created.body._id}`)
        .set(authHeader(token))
        .send({ name: 'New', phone: '1111111111', notes: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New');
      expect(res.body.phone).toBe('1111111111');
      expect(res.body.notes).toBe('Updated');
    });

    it('should reject empty name', async () => {
      const created = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Keep' });
      const res = await request(app)
        .put(`/api/customers/${created.body._id}`)
        .set(authHeader(token))
        .send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('should return 404 when updating non-existent', async () => {
      const res = await request(app)
        .put('/api/customers/000000000000000000000000')
        .set(authHeader(token))
        .send({ name: 'Anything' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should delete a customer and return success', async () => {
      const created = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Delete Me' });
      const res = await request(app)
        .delete(`/api/customers/${created.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should cascade-delete all entries when deleting customer', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Cascade' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 100, entry_date: '2026-04-01' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'got', amount: 50, entry_date: '2026-04-02' });

      await request(app).delete(`/api/customers/${cust.body._id}`).set(authHeader(token));

      // The customer should be gone, and fetching entries for a deleted customer
      // should return an empty array.
      const listRes = await request(app)
        .get(`/api/customers/${cust.body._id}/entries`)
        .set(authHeader(token));
      expect(listRes.body).toEqual([]);
    });

    it('should return 404 for non-existent customer', async () => {
      const res = await request(app)
        .delete('/api/customers/000000000000000000000000')
        .set(authHeader(token));
      expect(res.status).toBe(404);
    });
  });

  // ── Entry routes ───────────────────────────────────────────────────────────
  describe('POST /api/customers/entry', () => {
    let customerId;
    beforeEach(async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'E' });
      customerId = cust.body._id;
    });

    it('should create a "gave" entry', async () => {
      const res = await request(app)
        .post('/api/customers/entry')
        .set(authHeader(token))
        .send({ customer_id: customerId, type: 'gave', amount: 1000, entry_date: '2026-04-01' });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('gave');
      expect(res.body.amount).toBe(1000);
    });

    it('should create a "got" entry with notes', async () => {
      const res = await request(app)
        .post('/api/customers/entry')
        .set(authHeader(token))
        .send({ customer_id: customerId, type: 'got', amount: 500, entry_date: '2026-04-02', notes: 'UPI refund' });
      expect(res.status).toBe(201);
      expect(res.body.notes).toBe('UPI refund');
    });

    it('should reject invalid type', async () => {
      const res = await request(app)
        .post('/api/customers/entry')
        .set(authHeader(token))
        .send({ customer_id: customerId, type: 'borrowed', amount: 100, entry_date: '2026-04-01' });
      expect(res.status).toBe(400);
    });

    it('should reject zero or negative amount', async () => {
      const res = await request(app)
        .post('/api/customers/entry')
        .set(authHeader(token))
        .send({ customer_id: customerId, type: 'gave', amount: 0, entry_date: '2026-04-01' });
      expect(res.status).toBe(400);
    });

    it('should reject missing entry_date', async () => {
      const res = await request(app)
        .post('/api/customers/entry')
        .set(authHeader(token))
        .send({ customer_id: customerId, type: 'gave', amount: 100 });
      expect(res.status).toBe(400);
    });

    it('should reject entry for another users customer', async () => {
      const other = await createTestUser({ email: 'other@example.com' });
      const theirs = await request(app).post('/api/customers').set(authHeader(other.token))
        .send({ name: 'Their Cust' });

      const res = await request(app)
        .post('/api/customers/entry')
        .set(authHeader(token))
        .send({ customer_id: theirs.body._id, type: 'gave', amount: 100, entry_date: '2026-04-01' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not found|not yours/i);
    });
  });

  describe('GET /api/customers/:customerId/entries', () => {
    it('should list entries sorted newest first', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'ListCust' });

      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 100, entry_date: '2026-04-01' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'got', amount: 50, entry_date: '2026-04-05' });

      const res = await request(app)
        .get(`/api/customers/${cust.body._id}/entries`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      // Newest first
      expect(new Date(res.body[0].entry_date).getTime())
        .toBeGreaterThan(new Date(res.body[1].entry_date).getTime());
    });
  });

  describe('PUT /api/customers/entry/:id', () => {
    it('should update an entry', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Up' });
      const entry = await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 100, entry_date: '2026-04-01' });

      const res = await request(app)
        .put(`/api/customers/entry/${entry.body._id}`)
        .set(authHeader(token))
        .send({ amount: 250, notes: 'Updated note' });
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(250);
      expect(res.body.notes).toBe('Updated note');
    });

    it('should return 404 when updating non-existent entry', async () => {
      const res = await request(app)
        .put('/api/customers/entry/000000000000000000000000')
        .set(authHeader(token))
        .send({ amount: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/customers/entry/:id', () => {
    it('should delete an entry', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Del' });
      const entry = await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 100, entry_date: '2026-04-01' });

      const res = await request(app)
        .delete(`/api/customers/entry/${entry.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);

      // Customer totals should reflect the deletion
      const custRes = await request(app)
        .get(`/api/customers/${cust.body._id}`)
        .set(authHeader(token));
      expect(custRes.body.total_gave).toBe(0);
      expect(custRes.body.balance).toBe(0);
    });

    it('should not delete another users entry', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Owner' });
      const entry = await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 100, entry_date: '2026-04-01' });

      const other = await createTestUser({ email: 'other@example.com' });
      const res = await request(app)
        .delete(`/api/customers/entry/${entry.body._id}`)
        .set(authHeader(other.token));
      expect(res.status).toBe(404);
    });
  });

  // ── Balance scenarios ─────────────────────────────────────────────────────
  describe('Balance calculation', () => {
    it('should show positive balance when gave > got (customer owes user)', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Owes Me' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 1000, entry_date: '2026-04-01' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'got', amount: 400, entry_date: '2026-04-02' });

      const res = await request(app)
        .get(`/api/customers/${cust.body._id}`)
        .set(authHeader(token));
      expect(res.body.balance).toBe(600);
    });

    it('should show negative balance when got > gave (user owes customer/advance)', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Paid Ahead' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 200, entry_date: '2026-04-01' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'got', amount: 500, entry_date: '2026-04-02' });

      const res = await request(app)
        .get(`/api/customers/${cust.body._id}`)
        .set(authHeader(token));
      expect(res.body.balance).toBe(-300);
    });

    it('should be zero when gave equals got', async () => {
      const cust = await request(app).post('/api/customers').set(authHeader(token))
        .send({ name: 'Settled' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'gave', amount: 500, entry_date: '2026-04-01' });
      await request(app).post('/api/customers/entry').set(authHeader(token))
        .send({ customer_id: cust.body._id, type: 'got', amount: 500, entry_date: '2026-04-02' });

      const res = await request(app)
        .get(`/api/customers/${cust.body._id}`)
        .set(authHeader(token));
      expect(res.body.balance).toBe(0);
    });
  });
});
