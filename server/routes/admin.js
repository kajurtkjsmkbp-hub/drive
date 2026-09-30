const express = require('express');
const si = require('systeminformation');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');

const router = express.Router();

// Apply auth + requireAdmin to all routes here
router.use(authenticateToken, requireAdmin);

// GET /api/admin/metrics - TrueNAS-like System Overview
router.get('/metrics', async (req, res) => {
  try {
    const [load, mem, os, fsSize, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
      si.fsSize(),
      si.time()
    ]);

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const fileStats = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files WHERE is_trashed = 0').get();
    const shareCount = db.prepare('SELECT COUNT(*) as count FROM shares').get().count;

    res.json({
      cpu: {
        load: Math.round(load.currentLoad * 10) / 10,
        cores: load.cpus ? load.cpus.length : 1
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percent: Math.round((mem.used / mem.total) * 100)
      },
      os: {
        distro: os.distro,
        hostname: os.hostname,
        platform: os.platform,
        arch: os.arch,
        uptimeSeconds: time.uptime
      },
      disks: fsSize.map(d => ({
        fs: d.fs,
        type: d.type,
        size: d.size,
        used: d.used,
        available: d.available,
        usePercent: d.use,
        mount: d.mount
      })),
      stats: {
        totalUsers: userCount,
        totalFiles: fileStats.count,
        totalStorageUsed: fileStats.total_size,
        totalActiveShares: shareCount
      }
    });
  } catch (err) {
    console.error('[Metrics Error]', err);
    res.status(500).json({ error: 'Failed to retrieve system metrics.' });
  }
});

// GET /api/admin/users - User Management
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, email, role, quota_bytes, used_bytes, is_active, created_at
    FROM users
    ORDER BY id ASC
  `).all();

  res.json({ users });
});

// POST /api/admin/users - Add New User
router.post('/users', (req, res) => {
  const { username, email, password, role = 'user', quota_gb = 15 } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  const quotaBytes = Number(quota_gb) * 1024 * 1024 * 1024;
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, quota_bytes, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const result = stmt.run(username, email, passwordHash, role, quotaBytes);

    // Create user disk directory
    const userDir = path.join(__dirname, '..', '..', 'data', 'storage', 'users', username);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

    logActivity(req.user.id, req.user.username, 'ADMIN_CREATE_USER', `Created user account: ${username} (Role: ${role}, Quota: ${quota_gb}GB)`, req);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: Number(result.lastInsertRowid),
        username,
        email,
        role,
        quota_bytes: quotaBytes,
        is_active: 1
      }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id - Update User Role / Quota / Status / Password
router.put('/users/:id', (req, res) => {
  const userId = req.params.id;
  const { role, quota_gb, is_active, new_password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent admin from deactivating themselves
  if (req.user.id === Number(userId) && is_active === 0) {
    return res.status(400).json({ error: 'Cannot deactivate your own administrator account.' });
  }

  try {
    if (role) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    }
    if (quota_gb !== undefined) {
      const quotaBytes = Number(quota_gb) * 1024 * 1024 * 1024;
      db.prepare('UPDATE users SET quota_bytes = ? WHERE id = ?').run(quotaBytes, userId);
    }
    if (is_active !== undefined) {
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, userId);
    }
    if (new_password && new_password.trim() !== '') {
      const newHash = bcrypt.hashSync(new_password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
    }

    logActivity(req.user.id, req.user.username, 'ADMIN_UPDATE_USER', `Updated user: ${user.username}`, req);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id - Delete User
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  if (req.user.id === Number(userId)) {
    return res.status(400).json({ error: 'Cannot delete your own administrator account.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  try {
    // Delete files from disk
    const userDir = path.join(__dirname, '..', '..', 'data', 'storage', 'users', user.username);
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    logActivity(req.user.id, req.user.username, 'ADMIN_DELETE_USER', `Deleted user account: ${user.username}`, req);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// GET /api/admin/pools - Storage Pools
router.get('/pools', (req, res) => {
  const pools = db.prepare('SELECT * FROM storage_pools ORDER BY id ASC').all();
  res.json({ pools });
});

// GET /api/admin/logs - Activity Audit Logs
router.get('/logs', (req, res) => {
  const { limit = 100 } = req.query;
  const logs = db.prepare(`
    SELECT * FROM activity_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(Number(limit));

  res.json({ logs });
});

// GET /api/admin/settings - System Settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM system_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({ settings });
});

// PUT /api/admin/settings - Update Settings
router.put('/settings', (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload.' });
  }

  const stmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, String(value));
  }

  logActivity(req.user.id, req.user.username, 'UPDATE_SETTINGS', 'Updated system settings', req);

  res.json({ message: 'Settings saved successfully' });
});

module.exports = router;
