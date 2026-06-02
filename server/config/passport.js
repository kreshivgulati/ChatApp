const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ where: { google_id: profile.id } });

    if (user) {
      // User exists → just return them
      return done(null, user);
    }

    // New user → save to DB
    user = await User.create({
      google_id: profile.id,
      name:      profile.displayName,
      email:     profile.emails[0].value,
      avatar:    profile.photos[0].value,
    });

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Save user ID to session cookie
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Retrieve full user from session cookie
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});