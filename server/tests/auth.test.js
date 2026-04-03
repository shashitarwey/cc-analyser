const request = require('supertest');
const app = require('../app');
const { createTestUser, authHeader } = require('./helpers');
require('./setup');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@test.com', password: 'Abc@1234' });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alice@test.com');
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bob', email: 'bob@test.com', password: '123' });
      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'A', email: 'dup@test.com', password: 'Abc@1234' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'B', email: 'dup@test.com', password: 'Abc@1234' });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Carl', email: 'carl@test.com', password: 'Abc@1234' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'carl@test.com', password: 'Abc@1234' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dan', email: 'dan@test.com', password: 'Abc@1234' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'dan@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update profile with valid token', async () => {
      const { token } = await createTestUser();
      const res = await request(app)
        .put('/api/auth/profile')
        .set(authHeader(token))
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ name: 'No Auth' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/change-password', () => {
    it('should change password with correct old password', async () => {
      const { token, password } = await createTestUser({ email: 'chpw@test.com' });
      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader(token))
        .send({ old_password: password, new_password: 'NewPass@123' });
      expect(res.status).toBe(200);
    });

    it('should reject wrong old password', async () => {
      const { token } = await createTestUser({ email: 'chpw2@test.com' });
      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader(token))
        .send({ old_password: 'WrongOld@1', new_password: 'NewPass@123' });
      expect(res.status).toBe(401);
    });
  });

  describe('Account Deletion Flow', () => {
    it('should request and cancel deletion', async () => {
      const { token } = await createTestUser({ email: 'del@test.com' });

      const reqRes = await request(app)
        .post('/api/auth/request-deletion')
        .set(authHeader(token));
      expect(reqRes.status).toBe(200);

      const statusRes = await request(app)
        .get('/api/auth/account-status')
        .set(authHeader(token));
      expect(statusRes.body.deletion_requested_at).toBeTruthy();

      const cancelRes = await request(app)
        .post('/api/auth/cancel-deletion')
        .set(authHeader(token));
      expect(cancelRes.status).toBe(200);
    });
  });
});
