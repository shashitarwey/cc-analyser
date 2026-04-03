const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'cardvault_secret_change_in_prod';

async function createTestUser(overrides = {}) {
  const password = overrides.password || 'Test@1234';
  const hashed = await bcrypt.hash(password, 4); // low rounds for speed
  const user = await User.create({
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@example.com',
    password: hashed,
    ...overrides,
    password: hashed, // ensure hashed
  });
  const token = jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  return { user, token, password };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { createTestUser, authHeader, JWT_SECRET };
