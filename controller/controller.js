// src/controllers/ventController.js
const prisma = require('../config/db');

// ==========================================
// 📝 CREATE A NEW VENT (UPDATED WITH TAGS)
// ==========================================
const createVent = async (req, res) => {
  try {
    const { content, tags } = req.body; // tags expected as an array: ["academic", "vent"]

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Vent content cannot be empty." });
    }

    // Convert array to a clean space-separated string for SQLite tracking ("academic vent")
    let tagsString = "";
    if (tags && Array.isArray(tags)) {
      tagsString = tags.map(t => t.trim().toLowerCase().replace(/#/g, '')).join(' ');
    }

    const newVent = await prisma.vent.create({
      data: {
        content,
        userId: req.user.id,
        tags: tagsString,
        status: "approved",
        visibility: "public"
      }
    });

    res.status(201).json({
      success: true,
      message: "Vent broadcasted successfully.",
      vent: {
        id: newVent.id,
        content: newVent.content,
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
              select: { avatarId: true, area: true }
            },
            _count: {
              select: { comments: true }
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
const getTimeline = async (req, res) => {
  try {
    // Pull active, approved vents. Sort by latest first.
    const vents = await prisma.vent.findMany({
      where: {
        status: "approved",
        deletedAt: null // Excludes soft-deleted posts
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        content: true,
        feelsCount: true,
        createdAt: true,
        isEdited: true,
        // We only fetch masked user info to maintain public anonymity
        author: {
          select: {
            avatarId: true,
            area: true // Displays context like "Addis Ababa" next to the post
          }
        },
        // Pull back a fast relational count of how many replies exist
        _count: {
          select: { comments: true }
        }
      }
    });

    // Format output cleanly for our React Native UI mapping
    const formattedFeeds = vents.map(vent => ({
      id: vent.id,
      content: vent.content,
      feelsCount: vent.feelsCount,
      commentCount: vent._count.comments,
      createdAt: vent.createdAt,
      isEdited: vent.isEdited,
      location: vent.author.area,
      avatarId: vent.author.avatarId
    }));

    res.status(200).json({
      success: true,
      count: formattedFeeds.length,
      timeline: formattedFeeds
    });

  } catch (error) {
    console.error("Fetch Timeline Error:", error);
    res.status(500).json({ success: false, message: "Failed to load timeline feed." });
  }
};
// ==========================================
// ❤️ TOGGLE "I FEEL YOU" ENGAGEMENT METRIC
// ==========================================
const toggleFeelVent = async (req, res) => {
  try {
    const { id: ventId } = req.params;
    const userId = req.user.id; // Pulled from your active JWT token

    // 1. Verify the target vent exists
    const vent = await prisma.vent.findUnique({
      where: { id: ventId, deletedAt: null }
    });

    if (!vent) {
      return res.status(404).json({ success: false, message: "This vent no longer exists." });
    }

    // 2. Check if this specific user has already liked this post
    const existingFeel = await prisma.ventFeel.findUnique({
      where: {
        userId_ventId: { userId, ventId } // This is our unique compound key guard!
      }
    });

    let message = "";
    let countChange = 0;

    // 3. Update everything in a safe transaction block
    await prisma.$transaction(async (tx) => {
      if (existingFeel) {
        // If it exists, they are unliking it
        await tx.ventFeel.delete({
          where: { id: existingFeel.id }
        });
        countChange = -1;
        message = "Support retracted.";
      } else {
        // If it doesn't exist, they are liking it
        await tx.ventFeel.create({
          data: { userId, ventId }
        });
        countChange = 1;
        message = "Supported successfully.";
      }

      // Modify the core count field directly on the Vent row
      await tx.vent.update({
        where: { id: ventId },
        data: {
          feelsCount: {
            increment: countChange
          }
        }
      });
    });

    // 4. Fetch the final updated value
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


module.exports = { createVent, getTimeline, toggleFeelVent , getMyLikedVents };

