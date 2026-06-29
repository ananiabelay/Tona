const express = require('express');
const router = express.Router();
const { createVent, getTimeline, toggleFeelVent, getMyLikedVents } = require('../controller/controller');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createVent);
router.get('/', protect, getTimeline);
router.post('/:id/feel', protect, toggleFeelVent);


router.get('/liked', protect, getMyLikedVents);

module.exports = router;