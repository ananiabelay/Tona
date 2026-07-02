// src/controllers/commentController.js
const prisma = require('../config/db');



// ==========================================
// 💬 POST A COMMENT (OR A NESTED REPLY)
// ==========================================
const createComment = async (req, res) => {
  try {
    const { ventId } = req.params;
    const { content, parentId } = req.body; // parentId is optional
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Comment content cannot be empty." });
    }

    // 1. Verify the parent vent exists
    const vent = await prisma.vent.findUnique({
      where: { id: ventId, deletedAt: null }
    });

    if (!vent) {
      return res.status(404).json({ success: false, message: "This vent no longer exists." });
    }

    // notification
    if (vent.userId !== userId) {
      await prisma.userPrismaNotification.create({
        data: {
          type: "comment",
          entityType: "vent",
          entityId: ventId,
          userId: vent.userId,
          senderId: userId
        }
      });
    }

    // 2. If it's a nested reply, verify the target comment exists
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId, deletedAt: null }
      });

      if (!parentComment) {
        return res.status(404).json({ success: false, message: "The comment you are replying to was deleted." });
      }
    }

    // 3. Persist the comment/reply
    const comment = await prisma.comment.create({
      data: {
        content,
        ventId,
        userId,
        parentId: parentId || null,
        status: "approved"
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            area: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: parentId ? "Reply posted to comment." : "Top-level comment posted.",
      comment: {
        id: comment.id,
        content: comment.content,
        parentId: comment.parentId,
        location: comment.author.area,
        avatarId: comment.author.avatarId,
        user_id: comment.author.id,
        username: comment.author.username,
        createdAt: comment.createdAt
      }
    });

  } catch (error) {
    console.error("Create Comment/Reply Error:", error);
    res.status(500).json({ success: false, message: "Failed to post comment." });
  }
};



// ==========================================
// 📜 FETCH THE STRUCTURAL COMMENT THREAD
// ==========================================
const getVentComments = async (req, res) => {
  try {
    const { ventId } = req.params;
    const userId = req.user.id;

    const topLevelComments = await prisma.comment.findMany({
      where: {
        ventId,
        parentId: null,
        deletedAt: null
      },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarId: true,
            area: true
          }
        },
        likes: { where: { userId } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatarId: true,
                area: true
              }
            },
            likes: { where: { userId } }
          }
        }
      }
    });

    const formattedCommentTree = topLevelComments.map(c => ({
      id: c.id,
      content: c.content,
      likesCount: c.likesCount,
      createdAt: c.createdAt,
      location: c.author.area,
      avatarId: c.author.avatarId,

      // added fields
      user_id: c.author.id,
      username: c.author.username,

      hasLiked: c.likes.length > 0,

      replies: c.replies.map(r => ({
        id: r.id,
        parentId: r.parentId,
        content: r.content,
        likesCount: r.likesCount,
        createdAt: r.createdAt,
        location: r.author.area,
        avatarId: r.author.avatarId,

        // added fields
        user_id: r.author.id,
        username: r.author.username,

        hasLiked: r.likes.length > 0
      }))
    }));

    res.status(200).json({
      success: true,
      count: formattedCommentTree.length,
      comments: formattedCommentTree
    });

  } catch (error) {
    console.error("Get Comment Tree Error:", error);
    res.status(500).json({ success: false, message: "Failed to load comment tree structures." });
  }
};



// ==========================================
// 👍 SECURE TOGGLE COMMENT LIKES
// ==========================================
const toggleLikeComment = async (req, res) => {
  try {
    const { id: commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null }
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    const existingLike = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId, commentId } }
    });

    let countChange = 0;
    let message = "";

    await prisma.$transaction(async (tx) => {
      if (existingLike) {
        await tx.commentLike.delete({ where: { id: existingLike.id } });
        countChange = -1;
        message = "Like retracted.";
      } else {
        await tx.commentLike.create({ data: { userId, commentId } });
        countChange = 1;
        message = "Comment liked.";
      }

      await tx.comment.update({
        where: { id: commentId },
        data: { likesCount: { increment: countChange } }
      });
    });

    const updatedComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { likesCount: true }
    });

    res.status(200).json({
      success: true,
      message,
      likesCount: updatedComment.likesCount,
      hasLiked: !existingLike
    });

  } catch (error) {
    console.error("Toggle Comment Like Error:", error);
    res.status(500).json({ success: false, message: "Server error processing interaction." });
  }
};

module.exports = { createComment, getVentComments, toggleLikeComment };
