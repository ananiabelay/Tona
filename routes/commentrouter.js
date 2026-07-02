// src/routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const { createComment, getVentComments, toggleLikeComment } = require('../controller/comment');
const { protect } = require('../middleware/authMiddleware');

// Nested under /api/vents paths contextually
router.post('/:ventId/comments', protect, createComment);
router.get('/:ventId/comments', protect, getVentComments);

// Standalone comment interaction path
router.post('/comments/:id/like', protect, toggleLikeComment);

module.exports = router;