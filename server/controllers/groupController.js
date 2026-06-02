const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/groups — create group
const createGroup = async (req, res) => {
    const { name, description, member_ids } = req.body;

    console.log('Creating group:', { name, description, member_ids }); // debug log

    if (!name) return res.status(400).json({ message: 'Group name is required' });
    if (!member_ids || member_ids.length === 0)
        return res.status(400).json({ message: 'At least one member is required' });

    try {
        const group = await Group.create({
            name: name.trim(),
            description: description || '',
            created_by: req.user.id,
        });

        // Add creator as admin
        await GroupMember.create({
            group_id: group.id,
            user_id: req.user.id,
            role: 'admin',
        });

        // Normalize member_ids — handle string, number, or array
        const ids = Array.isArray(member_ids)
            ? member_ids
            : [member_ids];

        for (const uid of ids) {
            const parsedId = parseInt(uid);
            if (isNaN(parsedId)) continue;
            if (parsedId === req.user.id) continue; // skip creator, already added

            await GroupMember.findOrCreate({
                where: { group_id: group.id, user_id: parsedId },
                defaults: { role: 'member' },
            });
        }

        const fullGroup = await Group.findByPk(group.id, {
            include: [{
                model: GroupMember,
                as: 'members',
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }]
            }]
        });

        res.status(201).json(fullGroup);
    } catch (err) {
        console.error('Group creation error:', err); // debug log
        res.status(500).json({ message: 'Failed to create group', error: err.message });
    }
};

// GET /api/groups — my groups
const getMyGroups = async (req, res) => {
    try {
        const memberships = await GroupMember.findAll({
            where: { user_id: req.user.id },
            include: [{
                model: Group, as: 'group',
                include: [{ model: GroupMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }] }]
            }]
        });
        const groups = memberships.map(m => m.group);
        res.json(groups);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch groups', error: err.message });
    }
};

// GET /api/groups/:groupId/messages
const getGroupMessages = async (req, res) => {
    try {
        // Verify member
        const member = await GroupMember.findOne({
            where: { group_id: req.params.groupId, user_id: req.user.id }
        });
        if (!member) return res.status(403).json({ message: 'Not a group member' });

        const messages = await GroupMessage.findAll({
            where: { group_id: req.params.groupId },
            include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }],
            order: [['created_at', 'ASC']],
        });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
    }
};

// POST /api/groups/:groupId/messages
const sendGroupMessage = async (req, res) => {
    const { message } = req.body;
    const file = req.file;

    try {
        const member = await GroupMember.findOne({
            where: { group_id: req.params.groupId, user_id: req.user.id }
        });
        if (!member) return res.status(403).json({ message: 'Not a group member' });

        const newMsg = await GroupMessage.create({
            group_id: req.params.groupId,
            sender_id: req.user.id,
            message: message || '',
            file_url: file ? `/uploads/${file.filename}` : null,
            file_type: file ? file.mimetype : null,
            file_name: file ? file.originalname : null,
        });

        const fullMsg = await GroupMessage.findByPk(newMsg.id, {
            include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }]
        });

        res.status(201).json(fullMsg);
    } catch (err) {
        res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
};

// POST /api/groups/:groupId/members — add member
const addMember = async (req, res) => {
    const { user_id } = req.body;
    try {
        const isAdmin = await GroupMember.findOne({
            where: { group_id: req.params.groupId, user_id: req.user.id, role: 'admin' }
        });
        if (!isAdmin) return res.status(403).json({ message: 'Only admins can add members' });

        const [member, created] = await GroupMember.findOrCreate({
            where: { group_id: req.params.groupId, user_id: parseInt(user_id) },
            defaults: { role: 'member' }
        });

        if (!created) return res.status(400).json({ message: 'User already in group' });
        res.status(201).json(member);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add member', error: err.message });
    }
};

// DELETE /api/groups/:groupId/leave
const leaveGroup = async (req, res) => {
    const new_admin_id = req.body?.new_admin_id || req.query?.new_admin_id;
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
        const leavingMember = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId }
        });

        if (!leavingMember) {
            return res.status(404).json({ message: 'Membership not found' });
        }

        if (leavingMember.role === 'admin') {
            const { Op } = require('sequelize');
            const otherMembers = await GroupMember.findAll({
                where: {
                    group_id: groupId,
                    user_id: { [Op.ne]: userId }
                }
            });

            if (otherMembers.length > 0) {
                if (!new_admin_id) {
                    return res.status(400).json({
                        message: 'You must designate a new admin before leaving the group.'
                    });
                }

                // Promote the chosen user to admin
                const targetMember = await GroupMember.findOne({
                    where: { group_id: groupId, user_id: parseInt(new_admin_id) }
                });

                if (!targetMember) {
                    return res.status(400).json({
                        message: 'The designated user is not a member of this group.'
                    });
                }

                targetMember.role = 'admin';
                await targetMember.save();
            }
        }

        await leavingMember.destroy();
        res.json({ message: 'Left group successfully', new_admin_id });
    } catch (err) {
        res.status(500).json({ message: 'Failed to leave group', error: err.message });
    }
};

// PUT /api/groups/:groupId
const updateGroup = async (req, res) => {
    const { name, description } = req.body;
    try {
        const member = await GroupMember.findOne({
            where: { group_id: req.params.groupId, user_id: req.user.id }
        });
        if (!member) return res.status(403).json({ message: 'Not a group member' });
        if (member.role !== 'admin') return res.status(403).json({ message: 'Only admins can edit group details' });

        const group = await Group.findByPk(req.params.groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (name) group.name = name.trim();
        if (description !== undefined) group.description = description || '';
        await group.save();

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update group', error: err.message });
    }
};

// DELETE /api/groups/:groupId/members/:userId
const removeMember = async (req, res) => {
    try {
        const isAdmin = await GroupMember.findOne({
            where: { group_id: req.params.groupId, user_id: req.user.id, role: 'admin' }
        });
        if (!isAdmin) return res.status(403).json({ message: 'Only admins can remove members' });

        if (parseInt(req.params.userId) === req.user.id) {
            return res.status(400).json({ message: 'Cannot remove yourself' });
        }

        await GroupMember.destroy({
            where: { group_id: req.params.groupId, user_id: req.params.userId }
        });

        res.json({ message: 'Member removed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove member', error: err.message });
    }
};

// DELETE /api/groups/:groupId
const deleteGroup = async (req, res) => {
    try {
        const isAdmin = await GroupMember.findOne({
            where: { group_id: req.params.groupId, user_id: req.user.id, role: 'admin' }
        });
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only admins can delete the group' });
        }

        // Delete all messages in the group
        await GroupMessage.destroy({ where: { group_id: req.params.groupId } });
        // Delete all group members
        await GroupMember.destroy({ where: { group_id: req.params.groupId } });
        // Delete the group itself
        await Group.destroy({ where: { id: req.params.groupId } });

        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete group', error: err.message });
    }
};

// DELETE /api/groups/:groupId/messages/:messageId — delete individual group message
const deleteGroupMessage = async (req, res) => {
    const { groupId, messageId } = req.params;
    const userId = req.user.id;

    try {
        const msg = await GroupMessage.findByPk(messageId);
        if (!msg) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (msg.sender_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized to delete this message' });
        }

        if (msg.file_url) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '..', msg.file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await msg.destroy();
        res.json({ message: 'Group message deleted successfully', id: messageId });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete group message', error: err.message });
    }
};

module.exports = { createGroup, getMyGroups, getGroupMessages, sendGroupMessage, addMember, leaveGroup, upload, updateGroup, removeMember, deleteGroup, deleteGroupMessage };