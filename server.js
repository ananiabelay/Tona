const userRoutes = require('./routes/userRoutes');
const prisma = require('./config/db');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 5000;
const ventRoutes = require('./routes/ventRoutes'); // <
require('dotenv').config();


// Add this near the top with your other imports



// ... (keep your app.get('/api/health') and app.listen blocks)
// ==========================================
// 🛠️ GLOBAL MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json()); // Allows our routes to read raw JSON bodies

app.use(async (req, res, next) => {

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


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vents', ventRoutes);