// src/controllers/ventController.js
const prisma = require('../config/db');

const getVentById = async (req, res) => {
  try {
    const { id: ventId } = req.params;
    const userId = req.user.id;

    // 1. Fetch the target vent with its author details and comment counts
    const vent = await prisma.vent.findUnique({
      where: { 
        id: ventId, 
        deletedAt: null 
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            area: true,
            avatarId: true,
          }
        },
        _count: {
          select: { comments: true }
        },
        feels: {
          where: { userId }
        }
      }
    });

    if (!vent) {
      return res.status(404).json({ success: false, message: "Vent not found." });
    }

    // 2. Fetch the comments associated with this specific vent
    const comments = await prisma.comment.findMany({
      where: { ventId },
      orderBy: { createdAt: 'desc' }, // Newest comments first
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            area: true
          }
        }
      }
    });

    // 3. Format payload cleanly for the Expo screen
    const formattedVent = {
      id: vent.id,
      content: vent.content,
      createdAt: vent.createdAt,
      feelsCount: vent.feelsCount,
      commentCount: vent._count.comments,

      location: vent.author?.area || null,
      avatarId: vent.author?.avatarId || null,

      authorId: vent.author?.id || null,
      authorName: vent.author?.username || null,

      hasFelt: vent.feels.length > 0
    };

    const formattedComments = comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      location: c.author?.area || null
    }));

    // Send it back matching the React Native payload state structure
    res.status(200).json({
      success: true,
      vent: formattedVent,
      comments: formattedComments
    });

  } catch (error) {
    console.error("Fetch Single Vent Error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve thread details." });
  }
};
const createVent = async (req, res) => {
  try {
    const { content, tags } = req.body; // 1. Grab tags directly from the incoming body
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Vent content cannot be empty." });
    }

    // 2. 🛡️ Bulletproof Tag / Niche Parser
    let processedTagsString = "";
    
    if (tags) {
      if (Array.isArray(tags)) {
        // If frontend sends an array: ["coding", "Addis Devs"] -> "coding addisdevs"
        processedTagsString = tags
          .map(t => t.trim().toLowerCase().replace(/\s+/g, '')) // Lowercase and strip internal spaces
          .filter(t => t.length > 0)                            // Remove any empty strings
          .join(' ');                                           // Join with a single space space
      } else if (typeof tags === 'string' && tags.trim().length > 0) {
        // If frontend sends a raw string: "coding, exams" or "coding exams"
        processedTagsString = tags
          .toLowerCase()
          .replace(/,/g, ' ')                                   // Swap commas for spaces
          .trim()
          .replace(/\s+/g, ' ');                                // Normalize double spaces to single spaces
      }
    }

    // 3. Save directly to the database row
    const newVent = await prisma.vent.create({
      data: {
        content,
        userId,
        status: "pending",
        tags: processedTagsString || null // Saves the sanitized string or leaves it null
      }
    });

    res.status(201).json({
      success: true,
      message: "Vent broadcasted successfully.",
      vent: {
        id: newVent.id,
        content: newVent.content,
        // 🪄 Send it right back to the frontend as a clean array instantly
        tags: newVent.tags ? newVent.tags.split(' ') : [],
        createdAt: newVent.createdAt
      }
    });

  } catch (error) {
    console.error("Create Vent Error:", error);
    res.status(500).json({ success: false, message: "Failed to broadcast vent." });
  }
};

// ==========================================
// ❤️ FETCH ALL VENTS LIKED BY CURRENT USER
// ==========================================
const getMyLikedVents = async (req, res) => {
  try {
    const userId = req.user.id;

    // Pull all VentFeel relationships belonging to this specific user
    const likedRelationships = await prisma.ventFeel.findMany({
      where: { userId },
      include: {
  vent: {
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarId: true,
          area: true
        }
      },
      _count: {
        select: {
          comments: true
        }
      }
    }
  }
},
      orderBy: {
        createdAt: 'desc' // Shows most recently liked posts first
      }
    });

    // Format the output payload cleanly for mobile feed reuse
    const formattedTimeline = likedRelationships.map(item => {
      const vent = item.vent;
      return {
        id: vent.id,
        content: vent.content,
        feelsCount: vent.feelsCount,
        commentCount: vent._count.comments,
        tags: vent.tags ? vent.tags.split(' ') : [],
        createdAt: vent.createdAt,
        isEdited: vent.isEdited,
        location: vent.author.area,
        avatarId: vent.author.avatarId,
        hasFelt: true // Since it's from their liked list, it's always true
      };
    });

    res.status(200).json({
      success: true,
      count: formattedTimeline.length,
      timeline: formattedTimeline
    });

  } catch (error) {
    console.error("Fetch Liked Vents Error:", error);
    res.status(500).json({ success: false, message: "Failed to load liked vents." });
  }
};

// Keep your existing getTimeline and toggleFeelVent methods intact below...
// src/controllers/ventController.js

const getTimeline = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const userId = req.user.id;

    // Fetch timeline
    const vents = await prisma.vent.findMany({
      where: {
        status: "approved",
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        feelsCount: true,
        createdAt: true,
        isEdited: true,
        tags: true,

        // Author details
        author: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            area: true
          }
        },

        _count: {
          select: {
            comments: true
          }
        },

        feels: {
          where: {
            userId
          }
        }
      }
    });

    const formattedFeeds = vents.map((vent) => ({
      id: vent.id,
      content: vent.content,

      // Author information
      userId: vent.author.id,
      username: vent.author.username,
      avatarId: vent.author.avatarId,
      location: vent.author.area,

      // Vent information
      feelsCount: vent.feelsCount,
      commentCount: vent._count.comments,
      tags: vent.tags ? vent.tags.split(" ") : [],
      createdAt: vent.createdAt,
      isEdited: vent.isEdited,
      hasFelt: vent.feels.length > 0
    }));

    res.status(200).json({
      success: true,
      page,
      limit,
      count: formattedFeeds.length,
      timeline: formattedFeeds
    });

  } catch (error) {
    console.error("Fetch Paginated Timeline Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load timeline feed."
    });
  }
};

const toggleFeelVent = async (req, res) => {
  try {
    const { id: ventId } = req.params;
    const userId = req.user.id;

    // 1. Verify target vent exists
    const vent = await prisma.vent.findUnique({
      where: { id: ventId, deletedAt: null }
    });

    if (!vent) {
      return res.status(404).json({ success: false, message: "This vent no longer exists." });
    }

    // 2. Check for existing like tracking row
    const existingFeel = await prisma.ventFeel.findUnique({
      where: {
        userId_ventId: { userId, ventId }
      }
    });

    let message = "";
    let countChange = 0;

    // 3. Execute core logic inside the atomic transaction block
    await prisma.$transaction(async (tx) => {
      if (existingFeel) {
        // Unliking
        await tx.ventFeel.delete({
          where: { id: existingFeel.id }
        });
        countChange = -1;
        message = "Support retracted.";
      } else {
        // Liking
        await tx.ventFeel.create({
          data: { userId, ventId }
        });
        countChange = 1;
        message = "Supported successfully.";

        // 🔔 LIVE NOTIFICATION TRIGGER (Safely inside the transaction block using 'tx'!)
        if (vent.userId !== userId) { 
          await tx.userPrismaNotification.create({
            data: {
              type: "feel",
              entityType: "vent",
              entityId: ventId,
              userId: vent.userId, // Recipient (Post Owner)
              senderId: userId     // Actor (Liker)
            }
          });
        }
      }

      // Update the main aggregate counter safely on the Vent table
      await tx.vent.update({
        where: { id: ventId },
        data: {
          feelsCount: {
            increment: countChange
          }
        }
      });
    });

    // 4. Read final updated count state
    const updatedVent = await prisma.vent.findUnique({
      where: { id: ventId },
      select: { feelsCount: true }
    });

    res.status(200).json({
      success: true,
      message,
      feelsCount: updatedVent.feelsCount,
      hasFelt: !existingFeel
    });

  } catch (error) {
    console.error("Secure Toggle Feel Error:", error);
    res.status(500).json({ success: false, message: "Server error processing interaction." });
  }
};

const getMyVents = async (req, res) => {
  try {
    const userId = req.user.id; // Pulled from protected auth token

    const myVents = await prisma.vent.findMany({
      where: { 
        userId, 
        deletedAt: null // Don't show their deleted posts
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { comments: true }
        }
      }
    });

    const formattedVents = myVents.map(v => ({
      id: v.id,
      content: v.content,
      feelsCount: v.feelsCount,
      commentCount: v._count.comments,
      tags: v.tags ? v.tags.split(' ') : [],
      createdAt: v.createdAt,
      status: v.status,
      visibility: v.visibility
    }));

    res.status(200).json({
      success: true,
      count: formattedVents.length,
      vents: formattedVents
    });

  } catch (error) {
    console.error("Get My Vents Error:", error);
    res.status(500).json({ success: false, message: "Failed to load your posts history." });
  }
};

// ==========================================
// 🗑️ SECURE SOFT-DELETE A USER'S OWN VENT
// ==========================================
const deleteVent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Find the target post
    const vent = await prisma.vent.findUnique({
      where: { id }
    });

    if (!vent || vent.deletedAt !== null) {
      return res.status(404).json({ success: false, message: "Vent not found or already deleted." });
    }

    // 2. Security Check: Ensure the person trying to delete it actually owns it!
    if (vent.userId !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized. You can only delete your own vents." });
    }

    // 3. Perform the soft delete update
    await prisma.vent.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(200).json({
      success: true,
      message: "Vent successfully removed from your timeline."
    });

  } catch (error) {
    console.error("Delete Vent Error:", error);
    res.status(500).json({ success: false, message: "Failed to delete vent." });
  }
};

// Update your export list at the very bottom of the file!
module.exports = { 
  createVent, 
  getTimeline, 
  toggleFeelVent, 
  getMyLikedVents, 
  getMyVents, 
  deleteVent ,
  getVentById
};

