// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// 🔒 This endpoint is completely protected by our middleware guard
router.get('/me', protect, (req, res) => {
  // Because 'protect' ran successfully, req.user is already loaded with their DB data!
  res.status(200).json({
    success: true,
    user: req.user
  });
});

module.exports = router;