const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Group = require('./Group');

const GroupMessage = sequelize.define('GroupMessage', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER, allowNull: false },
    sender_id: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, defaultValue: '' },
    file_url: { type: DataTypes.STRING(500), allowNull: true },
    file_type: { type: DataTypes.STRING(100), allowNull: true },
    file_name: { type: DataTypes.STRING(255), allowNull: true },
}, {
    tableName: 'group_messages', // ← must match exactly
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [],
});

GroupMessage.belongsTo(User, { as: 'sender', foreignKey: 'sender_id' });
GroupMessage.belongsTo(Group, { as: 'group', foreignKey: 'group_id' });

module.exports = GroupMessage;