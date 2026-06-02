const express = require('express');
const router = express.Router();
const { getConversation, sendMessage, getUnreadCounts, upload, deleteMessage, deleteConversation, getRecentConversations } = require('../controllers/messageController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/unread', isAuthenticated, getUnreadCounts);
router.get('/recent', isAuthenticated, getRecentConversations);
router.get('/:userId', isAuthenticated, getConversation);
router.post('/', isAuthenticated, upload.single('file'), sendMessage);
router.delete('/:id', isAuthenticated, deleteMessage);
router.delete('/conversation/:userId', isAuthenticated, deleteConversation);

module.exports = router;