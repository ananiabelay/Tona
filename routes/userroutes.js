// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  updateProfile, 
  searchUsers, 
  getUserProfile 
  ,getMyProfile
  
} = require('../controller/usercontroller');

router.post('/update', protect, updateProfile);  
router.get('/search', protect, searchUsers);      
router.get('/profile/:id', protect, getUserProfile); 
router.get('/mine', protect, getMyProfile);
module.exports = router;
