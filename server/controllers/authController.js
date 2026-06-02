const User = require('../models/User');

// Get all users except the logged-in user
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        id: { $ne: req.user.id }  
      },
      attributes: ['id', 'name', 'email', 'avatar'],
    });

    // Sequelize uses Op.ne not $ne — fix:
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

module.exports = { getAllUsers };