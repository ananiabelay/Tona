// src/server.js
const prisma = require('./config/db');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 🛠️ GLOBAL MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json()); // Allows our routes to read raw JSON bodies

// ==========================================
// 🚧 SYSTEM MAINTENANCE KILL-SWITCH MIDDLEWARE
// ==========================================
app.use(async (req, res, next) => {
  // TODO: Later we will look up the single AppConfig row in SQLite.
  // For now, we mock it as false so development isn't locked out.
  const isMaintenanceMode = false; 

  if (isMaintenanceMode) {
    return res.status(503).json({
      success: false,
      message: "App is currently undergoing a critical system upgrade. Please check back shortly!",
      maintenance: true
    });
  }
  next();
});

// ==========================================
// 🔍 HEALTH CHECK / BASE TEST ROUTE
// ==========================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: "online",
    timestamp: new Date()
  });
});

// ==========================================
// 🚀 LAUNCH SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Venting App Backend live on Port: ${PORT}`);
  console.log(`=========================================`);
});