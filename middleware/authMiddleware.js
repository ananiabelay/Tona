// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  // 1. Check if the Authorization header exists and starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the raw token string from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify and decode the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Find the user in the database and attach them to the request object (minus password)
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          age: true,
          gender: true,
          area: true,
          avatarId: true,
          bio: true,
          isActive: true
        }
      });

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User no longer exists." });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ success: false, message: "Your account is suspended." });
      }

      // Everything looks good! Proceed to the actual route handler
      return next();

    } catch (error) {
      console.error("Token Auth Error:", error);
      return res.status(401).json({ success: false, message: "Not authorized, token failed." });
    }
  }

  // If no token was provided at all
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided." });
  }
};

module.exports = { protect };