// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { generateToken } = require('../utils/auth');


const signup = async (req, res) => {
  try {
    const { username, password, age, gender, area, avatarId, bio } = req.body;

    // 1. Basic validation
    if (!username || !password || !age || !gender || !area) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // 2. Check if username is already taken
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Username is already taken." });
    }

    // 3. Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Save user to SQLite via Prisma
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        age: parseInt(age),
        gender,
        area,
        avatarId: avatarId ? parseInt(avatarId) : 1,
        bio: bio || ""
      }
    });

    // 5. Issue JWT token
    const token = generateToken(newUser.id);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        avatarId: newUser.avatarId
      }
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: "Server error during registration." });
  }
};

// ==========================================
// 🔑 USER LOGIN
// ==========================================
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please provide username and password." });
    }

    // 1. Find user by username
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // 2. Check account active state (our banned/deactivated switch)
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account has been suspended." });
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // 4. Update lastSeenAt timestamp asynchronously
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() }
    }).catch(err => console.error("Failed to update lastSeenAt:", err));

    // 5. Issue fresh token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: "Welcome back!",
      token,
      user: {
        id: user.id,
        username: user.username,
        avatarId: user.avatarId
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server error during login." });
  }
};

module.exports = { signup, login };