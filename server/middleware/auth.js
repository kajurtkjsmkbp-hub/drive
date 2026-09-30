const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'aetherdrive-super-secret-key-proxmox-cloudflare-2026';

function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
}

function logActivity(userId, username, action, details, req) {
  try {
    const ip = req ? getClientIp(req) : '127.0.0.1';
    const stmt = db.prepare(`
      INSERT INTO activity_logs (user_id, username, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(userId || null, username || 'Anonymous', action, details, ip);
  } catch (err) {
    console.error('[ActivityLog Error]', err.message);
  }
}

function verifyJwt(token) {
  const secrets = [
    process.env.JWT_SECRET,
    'khanza_drive_enterprise_secret_key_change_in_production',
    'aetherdrive-super-secret-key-proxmox-cloudflare-2026'
  ].filter(Boolean);

  let lastErr = null;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Invalid token');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Also support token from query parameter for media streaming / download tags / iframes
  if (!token && req.query && req.query.token) {
    token = req.query.token.toString().trim();
    // In URLs, '+' is sometimes parsed as ' ' by query parser
    if (token.includes(' ')) {
      token = token.replace(/ /g, '+');
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  try {
    const decoded = verifyJwt(token);
    // Fetch fresh user data from DB
    const userStmt = db.prepare('SELECT id, username, email, role, quota_bytes, used_bytes, is_active FROM users WHERE id = ?');
    const user = userStmt.get(decoded.id);

    if (!user || user.is_active !== 1) {
      return res.status(403).json({ error: 'User account disabled or not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Error]', err.message, 'Token received prefix:', token ? token.substring(0, 15) : 'none');
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privilege required.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  getClientIp,
  logActivity,
  authenticateToken,
  requireAdmin
};
