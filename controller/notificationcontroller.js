// src/controllers/notificationController.js
const prisma = require('../config/db');

// Get personal alerts history
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.userPrismaNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30, // Keep the screen layout light
      select: {
        id: true,
        type: true,
        entityType: true,
        entityId: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: { avatarId: true, area: true }
        }
      }
    });

    const formattedAlerts = notifications.map(n => ({
      id: n.id,
      type: n.type,          // "feel" or "comment"
      entityType: n.entityType, // "vent" or "comment"
      entityId: n.entityId,     // Target ID to navigate to on click
      isRead: n.isRead,
      createdAt: n.createdAt,
      senderLocation: n.sender.area,
      senderAvatarId: n.sender.avatarId
    }));

    res.status(200).json({ success: true, count: formattedAlerts.length, notifications: formattedAlerts });
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    res.status(500).json({ success: false, message: "Failed to load alerts." });
  }
};

// Mark an alert as read when clicked on the mobile client
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.userPrismaNotification.findUnique({ where: { id } });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    await prisma.userPrismaNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });

    res.status(200).json({ success: true, message: "Alert updated." });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ success: false, message: "Failed to update alert state." });
  }
};

module.exports = { getMyNotifications, markAsRead };