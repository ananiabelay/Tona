const express = require('express');
const router = express.Router();
const { 
  createVent, 
  getTimeline, 
  toggleFeelVent, 
  getMyLikedVents,
  getMyVents,
  deleteVent ,
  getVentById
} = require('../controller/controller');
const { protect } = require('../middleware/authMiddleware');

// Base Core Routes
router.post('/', protect, createVent);
router.get('/', protect, getTimeline);

// Personal Profile Pipelines
router.get('/me', protect, getMyVents);          // 🔐 GET /api/vents/me
router.get('/liked', protect, getMyLikedVents);

// Dynamic Interaction & Removal Operations
router.post('/:id/feel', protect, toggleFeelVent);
router.delete('/:id', protect, deleteVent);       // 🗑️ DELETE /api/vents/:id
router.get('/:id', protect, getVentById);
module.exports = router;
