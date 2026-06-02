const express = require('express');
const router = express.Router();
const passport = require('passport');
require('dotenv').config();

// Step 1 — Redirect to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Step 2 — Google redirects back here
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    // Success → redirect to frontend
    res.redirect(`${process.env.CLIENT_URL}/chat`);
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.redirect(process.env.CLIENT_URL);
  });
});

// Get current logged in user
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  res.json({
    id:     req.user.id,
    name:   req.user.name,
    email:  req.user.email,
    avatar: req.user.avatar,
  });
});

// Failed login
router.get('/failed', (req, res) => {
  res.status(401).json({ message: 'Google login failed' });
});

module.exports = router;