const request = require('supertest');
const app = require('../app');
const { createTestUser, authHeader } = require('./helpers');
require('./setup');

describe('Orders Routes', () => {
  let token, cardId, sellerId;

  beforeEach(async () => {
    const testUser = await createTestUser();
    token = testUser.token;

    const card = await request(app).post('/api/cards').set(authHeader(token)).send({
      bank_name: 'ICICI Bank', card_network: 'Mastercard',
      last_four_digit: '5678', name_on_card: 'TEST',
    });
    cardId = card.body._id;

    const seller = await request(app).post('/api/sellers').set(authHeader(token)).send({
      name: 'Test Seller', city: 'Mumbai',
    });
    sellerId = seller.body._id;
  });

  const makeOrder = (overrides = {}) => ({
    order_date: '2026-03-01',
    order_amount: 10000,
    return_amount: 10500,
    quantity: 1,
    cashback: 0,
    variant: 'NA',
    model_ordered: 'iPhone 15',
    id_used: 'test@email.com',
    delivery_status: 'No',
    ecomm_site: 'Amazon',
    ...overrides,
  });

  describe('POST /api/orders', () => {
    it('should create an order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(token))
        .send(makeOrder({ card_id: cardId, seller_id: sellerId }));
      expect(res.status).toBe(201);
      expect(res.body.model_ordered).toBe('iPhone 15');
    });

    it('should reject without card_id', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set(authHeader(token))
        .send(makeOrder({ seller_id: sellerId }));
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('should return orders with filters', async () => {
      await request(app).post('/api/orders').set(authHeader(token))
        .send(makeOrder({ card_id: cardId, seller_id: sellerId }));

      const res = await request(app)
        .get('/api/orders')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should filter by seller', async () => {
      await request(app).post('/api/orders').set(authHeader(token))
        .send(makeOrder({ card_id: cardId, seller_id: sellerId }));

      const res = await request(app)
        .get('/api/orders')
        .query({ seller_id: sellerId })
        .set(authHeader(token));
      expect(res.body).toHaveLength(1);
    });
  });

  describe('PUT /api/orders/:id', () => {
    it('should update an order', async () => {
      const created = await request(app).post('/api/orders').set(authHeader(token))
        .send(makeOrder({ card_id: cardId, seller_id: sellerId }));

      const res = await request(app)
        .put(`/api/orders/${created.body._id}`)
        .set(authHeader(token))
        .send({ delivery_status: 'Yes', delivered_date: '2026-03-05' });
      expect(res.status).toBe(200);
      expect(res.body.delivery_status).toBe('Yes');
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should delete an order', async () => {
      const created = await request(app).post('/api/orders').set(authHeader(token))
        .send(makeOrder({ card_id: cardId, seller_id: sellerId }));

      const res = await request(app)
        .delete(`/api/orders/${created.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });
});
