const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    quota_bytes INTEGER NOT NULL DEFAULT 10737418240, -- Default 10GB
    used_bytes INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS storage_pools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mount_path TEXT NOT NULL,
    total_bytes INTEGER DEFAULT 0,
    used_bytes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ONLINE',
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_path TEXT NOT NULL DEFAULT '/',
    path TEXT NOT NULL, -- e.g. "/Documents/myfile.pdf"
    disk_path TEXT NOT NULL, -- actual filesystem location
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT DEFAULT 'application/octet-stream',
    is_dir INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    is_trashed INTEGER NOT NULL DEFAULT 0,
    trashed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    expires_at DATETIME,
    allow_download INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Insert default settings if not exists
const defaultSettings = [
  ['app_name', 'AetherDrive Cloud'],
  ['allow_public_registration', 'true'],
  ['default_quota_gb', '15'],
  ['webdav_enabled', 'true'],
  ['max_chunk_size_mb', '10'],
  ['cloudflare_trust_proxy', 'true']
];

const insertSettingStmt = db.prepare(`
  INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)
`);
for (const [key, value] of defaultSettings) {
  insertSettingStmt.run(key, value);
}

// Seed default Admin if no users exist
const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const userCount = userCountStmt.get().count;

if (userCount === 0) {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const insertAdminStmt = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, quota_bytes, is_active)
    VALUES (?, ?, ?, 'admin', 107374182400, 1) -- 100GB for admin
  `);
  insertAdminStmt.run('admin', 'admin@aetherdrive.local', adminPasswordHash);

  // Seed default storage pool
  const storageRoot = path.join(__dirname, '..', 'data', 'storage');
  const insertPoolStmt = db.prepare(`
    INSERT INTO storage_pools (name, mount_path, total_bytes, used_bytes, status, is_default)
    VALUES (?, ?, 1099511627776, 0, 'ONLINE', 1)
  `);
  insertPoolStmt.run('Default NVMe Pool', storageRoot);

  // Log activity
  const logStmt = db.prepare(`
    INSERT INTO activity_logs (user_id, username, action, details, ip_address)
    VALUES (1, 'admin', 'SYSTEM_INIT', 'System initialized with default administrator', '127.0.0.1')
  `);
  logStmt.run();

  console.log('[Database] Initialized with default admin (admin / admin123)');
}

module.exports = db;
