import { Router } from 'express';
import passport from 'passport';
import { getMe, logout, devLogin, generateToken, setAuthCookie } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { config } from '../config';

const router = Router();

// GET /api/auth/google
router.get('/google', (req, res, next) => {
  if (!config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID.startsWith('demo')) {
    // If OAuth keys aren't set, fallback seamlessly to dev login demo flow
    return devLogin(req, res);
  }
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

// GET /api/auth/google/callback
router.get('/google/callback', (req, res, next) => {
  if (!config.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID.startsWith('demo')) {
    return res.redirect(`${config.FRONTEND_URL}/dashboard`);
  }

  return passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${config.FRONTEND_URL}/login?error=auth_failed`);
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.redirect(`${config.FRONTEND_URL}/dashboard?token=${token}`);
  })(req, res, next);
});

// GET /api/auth/me
router.get('/me', requireAuth, getMe);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/dev-login (Instant Demo Login)
router.post('/dev-login', devLogin);

export default router;
