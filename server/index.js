require('./models/Message'); // ensures table is created on sync
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { createServer } = require('http');
const { Server } = require('socket.io');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
require('dotenv').config();

const sequelize = require('./config/db');
require('./config/passport');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const path = require('path');
const app = express();
const httpServer = createServer(app);
const groupRoutes = require('./routes/groupRoutes');
require('./models/Group');
require('./models/GroupMember');
require('./models/GroupMessage');
// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  }
});

// Session store in MySQL
const sessionStore = new SequelizeStore({ db: sequelize });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/groups', groupRoutes);

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/', (req, res) => res.json({ status: 'Server running ✅' }));

// Socket.io — real-time (basic setup, expanded in Step 6)
// Socket.io — real-time messaging
const onlineUsers = new Map(); // userId → socketId
const activeGroupCalls = new Map(); // groupId → Set of active call members JSON strings

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  // Join group room
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User joined group room: group_${groupId}`);
  });

  // Group message
  socket.on('send_group_message', (data) => {
    // Broadcast to everyone in the group room except sender
    socket.to(`group_${data.group_id}`).emit('receive_group_message', data);
    socket.emit('group_message_sent', data);
  });

  // Group typing
  socket.on('group_typing', ({ groupId, senderId, senderName }) => {
    socket.to(`group_${groupId}`).emit('group_user_typing', { senderId, senderName });
  });

  socket.on('group_stop_typing', ({ groupId, senderId }) => {
    socket.to(`group_${groupId}`).emit('group_user_stop_typing', { senderId });
  });

  // Group details updated
  socket.on('update_group_info', ({ groupId, name, description }) => {
    io.emit('group_info_updated', { groupId, name, description });
  });

  // Group member added
  socket.on('add_group_member', ({ groupId, member }) => {
    io.emit('group_member_added', { groupId, member });
  });

  // Group member removed
  socket.on('remove_group_member', ({ groupId, userId }) => {
    io.emit('group_member_removed', { groupId, userId });
  });

  // Group deleted
  socket.on('delete_group', ({ groupId }) => {
    io.emit('group_deleted', { groupId });
  });
  // User comes online
  socket.on('user_online', (userId) => {
    onlineUsers.set(String(userId), socket.id);
    // Broadcast updated online users list to everyone
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log(`✅ User ${userId} is online`);
  });

  // User sends a message
  socket.on('send_message', (data) => {
    const receiverSocketId = onlineUsers.get(String(data.receiver_id));
    if (receiverSocketId) {
      // Receiver is online — send directly
      io.to(receiverSocketId).emit('receive_message', data);
      console.log(`📨 Message sent to user ${data.receiver_id}`);
    } else {
      console.log(`📭 User ${data.receiver_id} is offline`);
    }
    socket.emit('message_sent', data);
  });

  // User deletes a message
  socket.on('delete_message', (data) => {
    const receiverSocketId = onlineUsers.get(String(data.receiver_id));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message_deleted', data);
      console.log(`🗑️ Message ${data.id} deletion sent to user ${data.receiver_id}`);
    }
  });

  // User deletes a group message
  socket.on('delete_group_message', ({ groupId, messageId }) => {
    socket.to(`group_${groupId}`).emit('group_message_deleted', { groupId, messageId });
    console.log(`🗑️ Group message ${messageId} deletion sent to room group_${groupId}`);
  });

  // Typing indicator
  socket.on('typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(String(receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', { senderId });
    }
  });

  // Stop typing
  socket.on('stop_typing', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(String(receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_stop_typing', { senderId });
    }
  });

  // CALL SIGNALING for PeerJS
  socket.on('call_user', ({ to, from, peerId, callType, caller }) => {
    const receiverSocketId = onlineUsers.get(String(to));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', { from, peerId, callType, caller });
    } else {
      socket.emit('call_failed', { message: 'User is offline' });
    }
  });

  socket.on('call_accepted', ({ to, receiverPeerId }) => {
    const callerSocketId = onlineUsers.get(String(to));
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', { receiverPeerId });
    }
  });

  socket.on('call_ended', ({ to }) => {
    const socketId = onlineUsers.get(String(to));
    if (socketId) io.to(socketId).emit('call_ended');
  });

  socket.on('call_state_changed', ({ to, isMuted, isCamOff }) => {
    const socketId = onlineUsers.get(String(to));
    if (socketId) io.to(socketId).emit('call_state_changed', { isMuted, isCamOff });
  });

  socket.on('call_chat_message', ({ to, text, senderId, time }) => {
    const socketId = onlineUsers.get(String(to));
    if (socketId) io.to(socketId).emit('call_chat_message', { text, senderId, time });
  });

  // GROUP CALL SIGNALING
  socket.on('group_call_start', ({ groupId, callType, callerId, callerName, peerId, avatar }) => {
    console.log(`📞 Group call started in group_${groupId} by ${callerName}`);
    const participants = new Set();
    participants.add(JSON.stringify({ userId: callerId, peerId, userName: callerName, avatar }));
    activeGroupCalls.set(String(groupId), participants);

    // Broadcast to room
    io.to(`group_${groupId}`).emit('group_call_started', {
      groupId,
      callType,
      callerId,
      callerName,
      participants: Array.from(participants).map(p => JSON.parse(p))
    });
  });

  socket.on('group_call_join', ({ groupId, userId, userName, peerId, avatar, callType }) => {
    console.log(`👤 User ${userName} joined group call in group_${groupId}`);
    let participants = activeGroupCalls.get(String(groupId));
    if (!participants) {
      participants = new Set();
    }
    
    // Safely find and remove existing entry without mutating Set during iteration
    const toRemove = [];
    for (const pStr of participants) {
      try {
        const p = JSON.parse(pStr);
        if (p && String(p.userId) === String(userId)) {
          toRemove.push(pStr);
        }
      } catch (err) {
        toRemove.push(pStr);
      }
    }
    toRemove.forEach(pStr => participants.delete(pStr));
    
    participants.add(JSON.stringify({ userId, peerId, userName, avatar }));
    activeGroupCalls.set(String(groupId), participants);

    // Broadcast updated participants and join event to room
    io.to(`group_${groupId}`).emit('group_call_updated', {
      groupId,
      callType,
      participants: Array.from(participants).map(p => {
        try {
          return JSON.parse(p);
        } catch (e) {
          return null;
        }
      }).filter(Boolean)
    });

    // Notify other peers to connect to this new peer
    socket.to(`group_${groupId}`).emit('group_peer_joined', { userId, userName, peerId, avatar });
  });

  socket.on('group_call_leave', ({ groupId, userId }) => {
    console.log(`🚪 User ${userId} left group call in group_${groupId}`);
    const participants = activeGroupCalls.get(String(groupId));
    if (participants) {
      const toRemove = [];
      for (const pStr of participants) {
        try {
          const p = JSON.parse(pStr);
          if (p && String(p.userId) === String(userId)) {
            toRemove.push(pStr);
          }
        } catch (err) {
          toRemove.push(pStr);
        }
      }
      toRemove.forEach(pStr => participants.delete(pStr));

      if (participants.size === 0) {
        activeGroupCalls.delete(String(groupId));
        io.to(`group_${groupId}`).emit('group_call_ended', { groupId });
      } else {
        io.to(`group_${groupId}`).emit('group_call_updated', {
          groupId,
          participants: Array.from(participants).map(p => {
            try {
              return JSON.parse(p);
            } catch (e) {
              return null;
            }
          }).filter(Boolean)
        });
      }
    }
    socket.to(`group_${groupId}`).emit('group_peer_left', { userId });
  });

  socket.on('group_call_state_changed', ({ groupId, userId, isMuted, isCamOff }) => {
    socket.to(`group_${groupId}`).emit('group_peer_state_changed', { userId, isMuted, isCamOff });
  });

  socket.on('get_active_group_call', (groupId) => {
    const participants = activeGroupCalls.get(String(groupId));
    if (participants) {
      socket.emit('active_group_call_response', {
        groupId,
        participants: Array.from(participants).map(p => {
          try {
            return JSON.parse(p);
          } catch (e) {
            return null;
          }
        }).filter(Boolean)
      });
    } else {
      socket.emit('active_group_call_response', { groupId, participants: [] });
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    onlineUsers.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        console.log(`❌ User ${userId} went offline`);
      }
    });

    // Auto cleanup calls user was participating in
    if (disconnectedUserId) {
      activeGroupCalls.forEach((participants, groupId) => {
        const toRemove = [];
        for (const pStr of participants) {
          try {
            const p = JSON.parse(pStr);
            if (p && String(p.userId) === String(disconnectedUserId)) {
              toRemove.push(pStr);
            }
          } catch (e) {
            toRemove.push(pStr);
          }
        }
        if (toRemove.length > 0) {
          toRemove.forEach(pStr => participants.delete(pStr));
          if (participants.size === 0) {
            activeGroupCalls.delete(groupId);
            io.to(`group_${groupId}`).emit('group_call_ended', { groupId });
          } else {
            io.to(`group_${groupId}`).emit('group_call_updated', {
              groupId,
              participants: Array.from(participants).map(p => {
                try {
                  return JSON.parse(p);
                } catch (e) {
                  return null;
                }
              }).filter(Boolean)
            });
            io.to(`group_${groupId}`).emit('group_peer_left', { userId: disconnectedUserId });
          }
        }
      });
    }

    // Broadcast updated online users
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});
// Sync DB and start server
const PORT = process.env.PORT || 5000;

sequelize.sync()
  .then(() => {
    sessionStore.sync();
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('DB connection failed:', err));