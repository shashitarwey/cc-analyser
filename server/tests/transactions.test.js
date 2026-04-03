const request = require('supertest');
const app = require('../app');
const { createTestUser, authHeader } = require('./helpers');
require('./setup');

describe('Transactions Routes', () => {
  let token, cardId;

  beforeEach(async () => {
    const testUser = await createTestUser();
    token = testUser.token;

    const card = await request(app).post('/api/cards').set(authHeader(token)).send({
      bank_name: 'Axis Bank', card_network: 'Visa',
      last_four_digit: '4321', name_on_card: 'TEST',
    });
    cardId = card.body._id;
  });

  describe('POST /api/transactions', () => {
    it('should create a transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set(authHeader(token))
        .send({ card_id: cardId, amount: 500, description: 'Groceries', date: '2026-03-15' });
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(500);
    });

    it('should reject invalid amount', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set(authHeader(token))
        .send({ card_id: cardId, amount: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/transactions', () => {
    it('should return merged transactions + orders', async () => {
      await request(app).post('/api/transactions').set(authHeader(token))
        .send({ card_id: cardId, amount: 1000, description: 'Test' });

      const res = await request(app)
        .get('/api/transactions')
        .query({ cardId })
        .set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction', async () => {
      const created = await request(app).post('/api/transactions').set(authHeader(token))
        .send({ card_id: cardId, amount: 200, description: 'Delete me' });

      const res = await request(app)
        .delete(`/api/transactions/${created.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);
    });
  });
});
