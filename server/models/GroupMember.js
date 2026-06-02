const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Group = require('./Group');

const GroupMember = sequelize.define('GroupMember', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
}, {
    tableName: 'group_members',  // ← must match exactly
    timestamps: true,
    createdAt: 'joined_at',
    updatedAt: false,
    indexes: [],
});

GroupMember.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
GroupMember.belongsTo(Group, { as: 'group', foreignKey: 'group_id' });
Group.hasMany(GroupMember, { as: 'members', foreignKey: 'group_id' });

module.exports = GroupMember;