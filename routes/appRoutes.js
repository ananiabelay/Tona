const express = require('express');
const router = express.Router();
const { checkAppStatus } = require('../controller/appconfig');

// Public startup endpoint for the mobile app
router.get('/', checkAppStatus);

module.exports = router;