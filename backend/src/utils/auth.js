const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role, counterId: user.counterId },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };