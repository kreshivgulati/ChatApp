const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Group = sequelize.define('Group', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING(500) },
    avatar: { type: DataTypes.STRING(500) },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'groups_table',   // ← must match exactly
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [],
});

Group.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

module.exports = Group;