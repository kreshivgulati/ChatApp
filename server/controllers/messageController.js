const { Op } = require('sequelize');
const Message = require('../models/Message');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// GET conversation
const getConversation = async (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);

  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: myId, receiver_id: otherId },
          { sender_id: otherId, receiver_id: myId },
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['created_at', 'ASC']],
    });

    await Message.update(
      { is_read: true },
      { where: { sender_id: otherId, receiver_id: myId, is_read: false } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
};

// POST send message (text or file)
const sendMessage = async (req, res) => {
  const { receiver_id, message } = req.body;
  const file = req.file;

  if (!receiver_id) {
    return res.status(400).json({ message: 'receiver_id is required' });
  }
  if (!message && !file) {
    return res.status(400).json({ message: 'Message or file is required' });
  }

  try {
    const newMessage = await Message.create({
      sender_id: req.user.id,
      receiver_id: parseInt(receiver_id),
      message: message || '',
      file_url: file ? `/uploads/${file.filename}` : null,
      file_type: file ? file.mimetype : null,
      file_name: file ? file.originalname : null,
    });

    const fullMessage = await Message.findByPk(newMessage.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'avatar'] },
      ]
    });

    res.status(201).json(fullMessage);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
};

// GET unread counts
const getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.findAll({
      where: { receiver_id: req.user.id, is_read: false },
      attributes: [
        'sender_id',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['sender_id'],
    });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unread counts', error: err.message });
  }
};

// DELETE message
const deleteMessage = async (req, res) => {
  const messageId = req.params.id;
  const myId = req.user.id;

  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender_id !== myId) {
      return res.status(403).json({ message: 'Unauthorized to delete this message' });
    }

    if (message.file_url) {
      const filePath = path.join(__dirname, '..', message.file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully', id: messageId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
};

// DELETE conversation
const deleteConversation = async (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);

  try {
    // Select all messages with files to unlink them
    const messagesWithFiles = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: myId, receiver_id: otherId },
          { sender_id: otherId, receiver_id: myId },
        ],
        file_url: { [Op.ne]: null }
      }
    });

    for (const msg of messagesWithFiles) {
      if (msg.file_url) {
        const filePath = path.join(__dirname, '..', msg.file_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await Message.destroy({
      where: {
        [Op.or]: [
          { sender_id: myId, receiver_id: otherId },
          { sender_id: otherId, receiver_id: myId }
        ]
      }
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete conversation', error: err.message });
  }
};

const getRecentConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    // Private messages recent timestamps
    const privateMessages = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }]
      },
      order: [['created_at', 'DESC']]
    });
    
    const times = {};
    privateMessages.forEach(msg => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const key = `user_${partnerId}`;
      if (!times[key]) {
        times[key] = new Date(msg.created_at).getTime();
      }
    });

    // Group messages recent timestamps
    const GroupMember = require('../models/GroupMember');
    const GroupMessage = require('../models/GroupMessage');
    const members = await GroupMember.findAll({ where: { user_id: userId } });
    const groupIds = members.map(m => m.group_id);

    if (groupIds.length > 0) {
      const groupMessages = await GroupMessage.findAll({
        where: {
          group_id: { [Op.in]: groupIds }
        },
        order: [['created_at', 'DESC']]
      });

      groupMessages.forEach(msg => {
        const key = `group_${msg.group_id}`;
        if (!times[key]) {
          times[key] = new Date(msg.created_at).getTime();
        }
      });
    }

    res.json(times);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recent conversations', error: err.message });
  }
};

module.exports = { getConversation, sendMessage, getUnreadCounts, upload, deleteMessage, deleteConversation, getRecentConversations };