// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead } = require('../controller/notificationcontroller');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMyNotifications);
router.put('/:id/read', protect, markAsRead);

module.exports = router;