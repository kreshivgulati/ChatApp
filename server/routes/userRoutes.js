const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById } = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/',    isAuthenticated, getAllUsers);
router.get('/:id', isAuthenticated, getUserById);

module.exports = router;