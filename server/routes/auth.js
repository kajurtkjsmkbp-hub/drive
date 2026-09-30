const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { JWT_SECRET, authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// Helper to ensure user storage directory exists
function ensureUserStorage(username) {
  const userDir = path.join(__dirname, '..', '..', 'data', 'storage', 'users', username);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const stmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
  const user = stmt.get(username, username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Ensure storage folder
  ensureUserStorage(user.username);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  logActivity(user.id, user.username, 'LOGIN', 'User logged in successfully', req);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      quota_bytes: user.quota_bytes,
      used_bytes: user.used_bytes,
      created_at: user.created_at
    }
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields (username, email, password) are required.' });
  }

  if (username.length < 3 || username.includes('/') || username.includes('\\') || username.includes(' ')) {
    return res.status(400).json({ error: 'Invalid username. Must be at least 3 characters and contain no spaces or slashes.' });
  }

  // Check if public registration is enabled
  const regSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'allow_public_registration'").get();
  if (regSetting && regSetting.value !== 'true') {
    return res.status(403).json({ error: 'Public registration is currently disabled by administrator.' });
  }

  // Check default quota
  const quotaSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'default_quota_gb'").get();
  const defaultQuotaGb = quotaSetting ? parseInt(quotaSetting.value, 10) : 15;
  const quotaBytes = defaultQuotaGb * 1024 * 1024 * 1024;

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, quota_bytes, is_active)
      VALUES (?, ?, ?, 'user', ?, 1)
    `);

    const result = insertStmt.run(username, email, passwordHash, quotaBytes);
    const userId = Number(result.lastInsertRowid);

    // Create user storage folder
    ensureUserStorage(username);

    logActivity(userId, username, 'REGISTER', 'New user account created', req);

    const token = jwt.sign(
      { id: userId, username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        username,
        email,
        role: 'user',
        quota_bytes: quotaBytes,
        used_bytes: 0
      }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Failed to create user account.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  // Calculate real total used bytes for the user
  const usageStmt = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0');
  const used = usageStmt.get(req.user.id).total;

  // Update user used_bytes in DB
  db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(used, req.user.id);

  res.json({
    user: {
      ...req.user,
      used_bytes: used
    }
  });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  const { current_password, new_password, email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (new_password) {
    if (!current_password || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is required and must be correct.' });
    }
    const newHash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  }

  if (email && email !== user.email) {
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.user.id);
  }

  logActivity(req.user.id, req.user.username, 'UPDATE_PROFILE', 'User updated account profile', req);

  res.json({ message: 'Profile updated successfully' });
});

module.exports = router;
