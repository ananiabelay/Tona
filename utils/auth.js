// src/utils/auth.js
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Long expiry so users don't have to keep logging back in on mobile
  });
};

module.exports = { generateToken };