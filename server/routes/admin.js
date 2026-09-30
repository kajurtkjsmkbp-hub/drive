const express = require('express');
const si = require('systeminformation');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const db = require('../db');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');

const router = express.Router();

// Helper to scan and index files on external USB/storage drives into user's files table
function scanExternalDirToDb(userId, physicalDir, virtualBase) {
  if (!fs.existsSync(physicalDir)) return 0;
  let count = 0;

  function scan(dirPath, virtualParent) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'System Volume Information' || entry.name === '$RECYCLE.BIN') {
          continue;
        }

        const fullDiskPath = path.join(dirPath, entry.name);
        const virtualPath = `${virtualParent}/${entry.name}`;

        if (entry.isDirectory()) {
          const existing = db.prepare('SELECT id FROM files WHERE user_id = ? AND path = ? AND is_dir = 1').get(userId, virtualPath);
          if (!existing) {
            db.prepare(`
              INSERT OR IGNORE INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
              VALUES (?, ?, ?, ?, ?, 0, 'directory', 1)
            `).run(userId, entry.name, virtualParent, virtualPath, fullDiskPath);
          }
          count++;
          scan(fullDiskPath, virtualPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullDiskPath);
            const mimeType = mime.lookup(entry.name) || 'application/octet-stream';
            const existing = db.prepare('SELECT id, size FROM files WHERE user_id = ? AND path = ? AND is_dir = 0').get(userId, virtualPath);

            if (!existing) {
              db.prepare(`
                INSERT OR IGNORE INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
              `).run(userId, entry.name, virtualParent, virtualPath, fullDiskPath, stat.size, mimeType);
            } else if (existing.size !== stat.size) {
              db.prepare('UPDATE files SET size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(stat.size, existing.id);
            }
            count++;
          } catch {}
        }
      }
    } catch (err) {
      console.error('[Scan USB Error]', err.message);
    }
  }

  scan(physicalDir, virtualBase);

  // Recalculate total used
  const totalUsed = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(userId).total;
  db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(totalUsed, userId);

  return count;
}

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

// GET /api/admin/usb - Detect connected USB flash drives and external hard disks
router.get('/usb', async (req, res) => {
  try {
    const [devices, fsSizes] = await Promise.all([
      si.blockDevices(),
      si.fsSize()
    ]);

    const isWindows = process.platform === 'win32';
    const isLinux = process.platform === 'linux';

    let usbDrives = [];

    // Filter candidate devices
    devices.forEach(d => {
      const isRemovable = d.removable || d.physical === 'Removable' || d.protocol === 'USB';
      const isPotentialLinuxDrive = isLinux && d.name && d.name.startsWith('sd') && d.name !== 'sda';
      const isWindowsExternal = isWindows && d.name && !['C:', 'D:', 'Z:'].includes(d.name.toUpperCase());

      if (isRemovable || isPotentialLinuxDrive || isWindowsExternal) {
        usbDrives.push(d);
      }
    });

    // Also check standard Linux/Proxmox mount locations (/media and /mnt)
    if (isLinux) {
      const scanDirs = ['/media', '/mnt'];
      scanDirs.forEach(baseDir => {
        if (fs.existsSync(baseDir)) {
          try {
            const list = fs.readdirSync(baseDir, { withFileTypes: true });
            list.forEach(entry => {
              if (entry.isDirectory()) {
                const fullMount = path.join(baseDir, entry.name);
                if (!usbDrives.some(u => u.mount === fullMount)) {
                  const statMatch = fsSizes.find(f => f.mount === fullMount);
                  usbDrives.push({
                    name: entry.name,
                    identifier: fullMount,
                    mount: fullMount,
                    label: entry.name,
                    fsType: statMatch?.type || 'NTFS/FAT',
                    size: statMatch?.size || 0,
                    removable: true
                  });
                }
              }
            });
          } catch {}
        }
      });
    }

    const processed = usbDrives.map(d => {
      const fsMatch = fsSizes.find(f => f.mount === d.mount || (d.name && f.fs && f.fs.includes(d.name)));
      const format = (d.fsType || fsMatch?.type || 'unknown').toUpperCase();
      const isNtfs = format.includes('NTFS');
      let mountPath = d.mount || fsMatch?.mount || null;

      if (isWindows && !mountPath && d.name && d.name.length === 2 && d.name.endsWith(':')) {
        mountPath = `${d.name}\\`;
      }

      const rawLabel = d.label || d.name || 'Flashdisk USB';
      const cleanLabel = rawLabel.replace(/[^\w\s-]/g, '').trim() || 'Flashdisk Eksternal';
      const folderName = `[USB] ${cleanLabel}`;
      const virtualPath = `/${folderName}`;

      // Check if already attached to user's Drive Saya
      const attachedRecord = db.prepare(`
        SELECT id, name, path FROM files 
        WHERE user_id = ? AND is_dir = 1 AND path = ? AND is_trashed = 0
      `).get(req.user.id, virtualPath);

      // Peek files inside mount if accessible
      let previewFiles = [];
      let totalFilesFound = 0;
      if (mountPath && fs.existsSync(mountPath)) {
        try {
          const entries = fs.readdirSync(mountPath, { withFileTypes: true });
          const valid = entries.filter(e => !e.name.startsWith('.') && e.name !== 'System Volume Information' && e.name !== '$RECYCLE.BIN');
          totalFilesFound = valid.length;
          previewFiles = valid.slice(0, 8).map(e => ({
            name: e.name,
            is_dir: e.isDirectory(),
            mime_type: e.isDirectory() ? 'directory' : (mime.lookup(e.name) || 'application/octet-stream')
          }));
        } catch {}
      }

      return {
        name: d.name,
        identifier: d.identifier || d.name,
        label: cleanLabel,
        format: format,
        isNtfs: isNtfs,
        size: d.size ? Number(d.size) : (fsMatch ? fsMatch.size : 0),
        used: fsMatch ? fsMatch.used : 0,
        available: fsMatch ? fsMatch.available : (d.size ? Number(d.size) : 0),
        mount: mountPath,
        isMounted: !!mountPath && fs.existsSync(mountPath),
        isAttached: !!attachedRecord,
        attachedFolder: folderName,
        attachedPath: virtualPath,
        removable: true,
        model: d.model || 'USB Flash Drive / External HDD',
        fileCount: totalFilesFound,
        previewFiles: previewFiles
      };
    });

    res.json({
      count: processed.length,
      drives: processed
    });
  } catch (err) {
    console.error('[USB Detect Error]', err);
    res.status(500).json({ error: 'Gagal mendeteksi perangkat USB.' });
  }
});

// POST /api/admin/usb/attach - 1-Click Connect Flashdisk/HDD into "Drive Saya"
router.post('/usb/attach', (req, res) => {
  const { mountPath, label } = req.body;
  if (!mountPath) {
    return res.status(400).json({ error: 'Titik pasang (mount path) diska diperlukan.' });
  }

  if (!fs.existsSync(mountPath)) {
    return res.status(404).json({ error: `Direktori diska tidak ditemukan di server: ${mountPath}` });
  }

  const cleanLabel = (label || path.basename(mountPath) || 'Flashdisk').replace(/[^\w\s-]/g, '').trim() || 'Flashdisk';
  const folderName = `[USB] ${cleanLabel}`;
  const virtualPath = `/${folderName}`;
  const userId = req.user.id;

  try {
    // 1. Ensure folder entry exists in files table
    const existing = db.prepare('SELECT id FROM files WHERE user_id = ? AND path = ? AND is_dir = 1').get(userId, virtualPath);

    if (!existing) {
      db.prepare(`
        INSERT INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
        VALUES (?, ?, '/', ?, ?, 0, 'directory', 1)
      `).run(userId, folderName, virtualPath, mountPath);
    } else {
      db.prepare('UPDATE files SET is_trashed = 0, disk_path = ? WHERE id = ?').run(mountPath, existing.id);
    }

    // 2. Scan and index files inside the flashdisk
    const indexedCount = scanExternalDirToDb(userId, mountPath, virtualPath);

    logActivity(userId, req.user.username, 'ATTACH_USB', `Attached USB storage "${cleanLabel}" into Drive Saya (${indexedCount} items indexed)`, req);

    res.json({
      message: `Flashdisk "${cleanLabel}" berhasil dihubungkan ke Drive Saya! ${indexedCount} berkas & folder siap diakses.`,
      folderName,
      virtualPath,
      indexedCount
    });
  } catch (err) {
    console.error('[Attach USB Error]', err);
    res.status(500).json({ error: 'Gagal menghubungkan flashdisk ke Drive: ' + err.message });
  }
});

// POST /api/admin/usb/eject - 1-Click Safely Eject and unlink from "Drive Saya"
router.post('/usb/eject', (req, res) => {
  const { mountPath, virtualPath } = req.body;
  const userId = req.user.id;

  try {
    if (virtualPath) {
      db.prepare(`
        DELETE FROM files 
        WHERE user_id = ? AND (path = ? OR parent_path = ? OR parent_path LIKE ?)
      `).run(userId, virtualPath, virtualPath, `${virtualPath}/%`);
    }

    // On Linux/Proxmox, safely unmount
    if (process.platform === 'linux' && mountPath) {
      try {
        const { execSync } = require('child_process');
        execSync(`umount -l ${mountPath} 2>/dev/null || true`);
      } catch {}
    }

    logActivity(userId, req.user.username, 'EJECT_USB', `Safely unmounted and removed USB storage: ${virtualPath || mountPath}`, req);

    res.json({
      message: 'Flashdisk telah berhasil dilepas dari Drive Saya dan aman untuk dicabut secara fisik dari port server.'
    });
  } catch (err) {
    console.error('[Eject USB Error]', err);
    res.status(500).json({ error: 'Gagal melepaskan flashdisk: ' + err.message });
  }
});

// POST /api/admin/usb/mount - Mount USB device (supports NTFS via ntfs-3g)
router.post('/usb/mount', (req, res) => {
  const { device, name, mountPath } = req.body;
  const isLinux = process.platform === 'linux';

  if (!isLinux) {
    return res.json({
      message: 'Flashdisk telah terpasang secara otomatis dan dapat langsung diakses oleh sistem.',
      mountPath: mountPath || name
    });
  }

  // On Linux/Proxmox LXC:
  const targetDir = mountPath || `/media/usb_${name || 'disk'}`;
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const { execSync } = require('child_process');
    execSync(`mount -o rw ${device} ${targetDir} || mount -t ntfs-3g ${device} ${targetDir}`);

    logActivity(req.user.id, req.user.username, 'MOUNT_USB', `Mounted USB ${device} to ${targetDir}`, req);

    res.json({
      message: `Flashdisk berhasil dipasang ke direktori ${targetDir}`,
      mountPath: targetDir
    });
  } catch (err) {
    console.error('[Mount USB Error]', err);
    res.status(500).json({
      error: `Gagal memasang perangkat USB: ${err.message}. Pastikan paket driver ntfs-3g terpasang jika menggunakan format NTFS.`
    });
  }
});

// GET /api/admin/backup-db - One-click SQLite database backup
router.get('/backup-db', (req, res) => {
  const dbPath = path.join(__dirname, '..', '..', 'data', 'database.sqlite');
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'Berkas database tidak ditemukan.' });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const backupName = `AetherDrive-Backup-${dateStr}.sqlite`;

  logActivity(req.user.id, req.user.username, 'BACKUP_DB', 'Mengunduh berkas cadangan database SQLite', req);

  res.setHeader('Content-Disposition', `attachment; filename="${backupName}"`);
  res.setHeader('Content-Type', 'application/x-sqlite3');
  fs.createReadStream(dbPath).pipe(res);
});

module.exports = router;
