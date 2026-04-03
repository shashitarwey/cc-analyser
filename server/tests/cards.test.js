const request = require('supertest');
const app = require('../app');
const { createTestUser, authHeader } = require('./helpers');
require('./setup');

describe('Cards Routes', () => {
  let token;

  beforeEach(async () => {
    const testUser = await createTestUser();
    token = testUser.token;
  });

  const validCard = {
    bank_name: 'HDFC Bank',
    card_network: 'Visa',
    last_four_digit: '1234',
    name_on_card: 'TEST USER',
  };

  describe('POST /api/cards', () => {
    it('should create a card', async () => {
      const res = await request(app)
        .post('/api/cards')
        .set(authHeader(token))
        .send(validCard);
      expect(res.status).toBe(201);
      expect(res.body.bank_name).toBe('HDFC Bank');
      expect(res.body.last_four_digit).toBe('1234');
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/api/cards').send(validCard);
      expect(res.status).toBe(401);
    });

    it('should reject invalid last_four_digit', async () => {
      const res = await request(app)
        .post('/api/cards')
        .set(authHeader(token))
        .send({ ...validCard, last_four_digit: 'abc' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/cards', () => {
    it('should return empty array initially', async () => {
      const res = await request(app).get('/api/cards').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return created cards', async () => {
      await request(app).post('/api/cards').set(authHeader(token)).send(validCard);
      const res = await request(app).get('/api/cards').set(authHeader(token));
      expect(res.body).toHaveLength(1);
    });
  });

  describe('PUT /api/cards/:id', () => {
    it('should update a card', async () => {
      const created = await request(app).post('/api/cards').set(authHeader(token)).send(validCard);
      const res = await request(app)
        .put(`/api/cards/${created.body._id}`)
        .set(authHeader(token))
        .send({ name_on_card: 'UPDATED NAME' });
      expect(res.status).toBe(200);
      expect(res.body.name_on_card).toBe('UPDATED NAME');
    });

    it('should not update another user\'s card', async () => {
      const created = await request(app).post('/api/cards').set(authHeader(token)).send(validCard);
      const other = await createTestUser({ email: 'other@test.com' });
      const res = await request(app)
        .put(`/api/cards/${created.body._id}`)
        .set(authHeader(other.token))
        .send({ name_on_card: 'HACKER' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/cards/:id', () => {
    it('should delete a card and its transactions', async () => {
      const created = await request(app).post('/api/cards').set(authHeader(token)).send(validCard);
      const res = await request(app)
        .delete(`/api/cards/${created.body._id}`)
        .set(authHeader(token));
      expect(res.status).toBe(200);

      const list = await request(app).get('/api/cards').set(authHeader(token));
      expect(list.body).toHaveLength(0);
    });
  });
});
