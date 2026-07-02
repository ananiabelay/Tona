const prisma = require('../config/db');

/**
 * 🔍 DEBUG: Get My Profile
 */
const getMyProfile = async (req, res) => {
  try {
    console.log("=== DEBUG: GET MY PROFILE ===");
    console.log("Authorization Header:", req.headers.authorization);
    console.log("req.user:", req.user);

    return res.status(200).json({
      success: true,
      message: "Debug payload active",
      debugData: {
        userObjectFromMiddleware: req.user || null,
        userId: req.user ? req.user.id : "No user ID found",
        username: req.user ? req.user.username : "No username found",
        incomingHeaders: {
          authorization: req.headers.authorization || null,
          contentType: req.headers['content-type']
        }
      }
    });

  } catch (error) {
    console.error("Debug Route Error:", error);
    return res.status(500).json({
      success: false,
      message: "Debug function failed",
      error: error.message
    });
  }
};


/**
 * 🔄 UPDATE PROFILE
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, area, avatarId, bio } = req.body;

    // Check username uniqueness
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.trim().toLowerCase(),
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken."
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username: username.trim().toLowerCase() }),
        ...(area && { area: area.trim() }),
        ...(avatarId && { avatarId: parseInt(avatarId) }),
        ...(bio !== undefined && { bio: bio.trim() })
      },
      select: {
        id: true,
        username: true,
        area: true,
        avatarId: true,
        bio: true
      }
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};


/**
 * 🔍 SEARCH USERS (FIXED VERSION)
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    const searchTerm = q.trim().toLowerCase();

    /**
     * ⚠️ IMPORTANT FIX EXPLANATION:
     * If you get "Unknown argument mode", your Prisma setup does NOT support:
     *   mode: 'insensitive'
     *
     * This happens when:
     * - Prisma client not regenerated
     * - schema mismatch
     * - username is not String type
     */

    const users = await prisma.user.findMany({
      where: {
        // SAFE VERSION (works everywhere)
        username: {
          contains: searchTerm
          // ❌ removed: mode: 'insensitive'
        }
      },
      take: 10,
      select: {
        id: true,
        username: true,
        avatarId: true,
        area: true
      }
    });

    return res.status(200).json({
      success: true,
      users
    });

  } catch (error) {
    console.error("Search Users Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error executing search query"
    });
  }
};


/**
 * 👤 GET USER PROFILE
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarId: true,
        area: true,
        bio: true,
        createdAt: true,
        // 1. Fetching the actual vents list (limiting to 10 latest)
        vents: {
          where: {
            deletedAt: null,
            status: "approved"
          },
          orderBy: {
            createdAt: 'desc' // Shows newest vents first
          },
          take: 10
        },
        // Keeping your original total counter block intact
        _count: {
          select: {
            vents: {
              where: {
                deletedAt: null,
                status: "approved"
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        avatarId: user.avatarId,
        area: user.area,
        bio: user.bio,
        ventsCount: user._count.vents,
        vents: user.vents || [], // 2. Attached the array safely here
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load profile"
    });
  }
};


module.exports = {
  updateProfile,
  searchUsers,
  getUserProfile,
  getMyProfile
};