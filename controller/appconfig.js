// src/controllers/appConfigController.js
const prisma = require('../config/db');

// Check app maintenance status and version updates
const checkAppStatus = async (req, res) => {
  try {
    // Assuming you have a single config row or want the latest global configuration
    const config = await prisma.appConfig.findFirst({
      select: {
        isMaintenance: true,
        updatedAt: true,
        // You might want to add these fields to your schema later to handle actual updates:
        // currentVersion: true,
        // minRequiredVersion: true,
      }
    });

    if (!config) {
      // Fallback if the database config table hasn't been initialized yet
      return res.status(200).json({
        success: true,
        isMaintenance: false,
        updatedAt: new Date(),
        hasUpdate: false
      });
    }

    res.status(200).json({
      success: true,
      isMaintenance: config.isMaintenance,
      updatedAt: config.updatedAt,
      // You can implement custom version-checking logic here if the client sends its current version
      // e.g., hasUpdate: req.query.version !== config.currentVersion
    });
  } catch (error) {
    console.error("App Status Check Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch app configurations." });
  }
};

module.exports = { checkAppStatus };