const express = require('express');
const router = express.Router();
const { createGroup, getMyGroups, getGroupMessages, sendGroupMessage, addMember, leaveGroup, upload, updateGroup, removeMember, deleteGroup, deleteGroupMessage } = require('../controllers/groupController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.post('/', isAuthenticated, createGroup);
router.get('/', isAuthenticated, getMyGroups);
router.get('/:groupId/messages', isAuthenticated, getGroupMessages);
router.post('/:groupId/messages', isAuthenticated, upload.single('file'), sendGroupMessage);
router.delete('/:groupId/messages/:messageId', isAuthenticated, deleteGroupMessage);
router.post('/:groupId/members', isAuthenticated, addMember);
router.delete('/:groupId/leave', isAuthenticated, leaveGroup);
router.put('/:groupId', isAuthenticated, updateGroup);
router.delete('/:groupId/members/:userId', isAuthenticated, removeMember);
router.delete('/:groupId', isAuthenticated, deleteGroup);

module.exports = router;