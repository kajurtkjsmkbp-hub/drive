const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const webdav = require('webdav-server').v2;
const mime = require('mime-types');
const db = require('../db');

const USERS_ROOT = path.join(__dirname, '..', '..', 'data', 'storage', 'users');

// Cache of WebDAVServer instances per user
const userServers = new Map();

// Helper to sync disk folder into SQLite database
function syncUserDiskToDb(userId, username) {
  try {
    const userRoot = path.join(USERS_ROOT, username);
    if (!fs.existsSync(userRoot)) return;

    function scanDir(dirPath, virtualParent) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullDiskPath = path.join(dirPath, entry.name);
        const virtualPath = virtualParent === '/' ? `/${entry.name}` : `${virtualParent}/${entry.name}`;

        if (entry.isDirectory()) {
          const existingDir = db.prepare('SELECT id FROM files WHERE user_id = ? AND path = ? AND is_dir = 1').get(userId, virtualPath);
          if (!existingDir) {
            db.prepare(`
              INSERT OR IGNORE INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
              VALUES (?, ?, ?, ?, ?, 0, 'directory', 1)
            `).run(userId, entry.name, virtualParent, virtualPath, fullDiskPath);
          }
          scanDir(fullDiskPath, virtualPath);
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullDiskPath);
          const mimeType = mime.lookup(entry.name) || 'application/octet-stream';
          const existingFile = db.prepare('SELECT id, size FROM files WHERE user_id = ? AND path = ? AND is_dir = 0').get(userId, virtualPath);

          if (!existingFile) {
            db.prepare(`
              INSERT OR IGNORE INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `).run(userId, entry.name, virtualParent, virtualPath, fullDiskPath, stat.size, mimeType);
          } else if (existingFile.size !== stat.size) {
            db.prepare('UPDATE files SET size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stat.size, existingFile.id);
          }
        }
      }
    }

    scanDir(userRoot, '/');

    // Recalculate total used
    const totalUsed = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(userId).total;
    db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(totalUsed, userId);
  } catch (err) {
    console.error('[WebDAV Sync Error]', err.message);
  }
}

function getOrCreateUserServer(user) {
  if (userServers.has(user.username)) {
    return userServers.get(user.username);
  }

  const userRoot = path.join(USERS_ROOT, user.username);
  if (!fs.existsSync(userRoot)) {
    fs.mkdirSync(userRoot, { recursive: true });
  }

  // Create WebDAV server mounted at user's directory
  const server = new webdav.WebDAVServer({
    requireAuthentification: false, // We handle auth at Express level
    rootFileSystem: new webdav.PhysicalFileSystem(userRoot)
  });

  const middleware = webdav.extensions.express('/', server);
  const entry = { server, middleware };
  userServers.set(user.username, entry);
  return entry;
}

// Router for WebDAV
const router = express.Router();

router.use((req, res, next) => {
  // Check system setting for WebDAV
  const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'webdav_enabled'").get();
  if (setting && setting.value !== 'true') {
    return res.status(503).send('WebDAV is disabled on this server.');
  }

  // Parse HTTP Basic Auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AetherDrive WebDAV Storage"');
    return res.status(401).send('Authentication required for WebDAV access');
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii').split(':');
  const username = credentials[0];
  const password = credentials.slice(1).join(':');

  if (!username || !password) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AetherDrive WebDAV Storage"');
    return res.status(401).send('Invalid credentials');
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AetherDrive WebDAV Storage"');
    return res.status(401).send('Invalid username or password');
  }

  // User authenticated!
  const userEntry = getOrCreateUserServer(user);

  // Hook response finish to sync database after WebDAV write operations (PUT, MKCOL, DELETE, MOVE)
  const isWriteMethod = ['PUT', 'MKCOL', 'DELETE', 'MOVE', 'COPY'].includes(req.method.toUpperCase());
  if (isWriteMethod) {
    res.on('finish', () => {
      syncUserDiskToDb(user.id, user.username);
    });
  }

  // Pass to WebDAV middleware after stripping auth header to prevent internal webdav-server 401
  delete req.headers.authorization;
  userEntry.middleware(req, res, next);
});

module.exports = router;
