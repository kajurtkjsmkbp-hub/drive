const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../db');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// POST /api/shares - Create share link
router.post('/', authenticateToken, (req, res) => {
  const { file_id, password, expires_in_days, allow_download = 1 } = req.body;

  if (!file_id) {
    return res.status(400).json({ error: 'File ID is required.' });
  }

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_trashed = 0').get(file_id, req.user.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found or in trash.' });
  }

  const shareToken = crypto.randomBytes(16).toString('hex');
  const passwordHash = password && password.trim() !== '' ? bcrypt.hashSync(password, 10) : null;

  let expiresAt = null;
  if (expires_in_days && Number(expires_in_days) > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + Number(expires_in_days));
    expiresAt = expDate.toISOString();
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO shares (file_id, user_id, share_token, password_hash, expires_at, allow_download)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(file_id, req.user.id, shareToken, passwordHash, expiresAt, allow_download ? 1 : 0);

    logActivity(req.user.id, req.user.username, 'CREATE_SHARE', `Created share link for ${file.name}`, req);

    res.status(201).json({
      message: 'Share link created successfully',
      share: {
        id: Number(result.lastInsertRowid),
        file_id,
        file_name: file.name,
        is_dir: file.is_dir,
        share_token: shareToken,
        has_password: !!passwordHash,
        expires_at: expiresAt,
        allow_download: allow_download ? 1 : 0
      }
    });
  } catch (err) {
    console.error('[Create Share Error]', err);
    res.status(500).json({ error: 'Failed to create share link.' });
  }
});

// GET /api/shares - List user shares
router.get('/', authenticateToken, (req, res) => {
  const shares = db.prepare(`
    SELECT s.*, f.name as file_name, f.size, f.mime_type, f.is_dir
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);

  res.json({ shares });
});

// DELETE /api/shares/:id - Revoke share link
router.delete('/:id', authenticateToken, (req, res) => {
  const shareId = req.params.id;
  const share = db.prepare('SELECT * FROM shares WHERE id = ? AND user_id = ?').get(shareId, req.user.id);

  if (!share) {
    return res.status(404).json({ error: 'Share link not found.' });
  }

  db.prepare('DELETE FROM shares WHERE id = ?').run(shareId);
  logActivity(req.user.id, req.user.username, 'REVOKE_SHARE', `Revoked share token ${share.share_token}`, req);

  res.json({ message: 'Share link revoked successfully' });
});

// PUBLIC ENDPOINTS FOR SHARED LINKS (No login required)

// GET /public/share/info/:token - Check share info & verify password
router.get('/info/:token', (req, res) => {
  const { token } = req.params;
  const { password } = req.query;

  const share = db.prepare(`
    SELECT s.*, f.name as file_name, f.size, f.mime_type, f.is_dir, u.username as owner_name
    FROM shares s
    JOIN files f ON s.file_id = f.id
    JOIN users u ON s.user_id = u.id
    WHERE s.share_token = ?
  `).get(token);

  if (!share) {
    return res.status(404).json({ error: 'Shared link not found or expired.' });
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired.' });
  }

  const requiresPassword = !!share.password_hash;
  let passwordValid = false;

  if (requiresPassword) {
    if (password && bcrypt.compareSync(password, share.password_hash)) {
      passwordValid = true;
    }
  } else {
    passwordValid = true;
  }

  // Increment view count if accessible
  if (passwordValid) {
    db.prepare('UPDATE shares SET view_count = view_count + 1 WHERE id = ?').run(share.id);
  }

  res.json({
    file_name: share.file_name,
    size: share.size,
    mime_type: share.mime_type,
    is_dir: share.is_dir,
    owner_name: share.owner_name,
    created_at: share.created_at,
    expires_at: share.expires_at,
    requires_password: requiresPassword,
    password_valid: passwordValid,
    allow_download: share.allow_download === 1
  });
});

// GET /public/share/:token/download - Download shared file
router.get('/:token/download', (req, res) => {
  const { token } = req.params;
  const { password } = req.query;

  const share = db.prepare(`
    SELECT s.*, f.name as file_name, f.disk_path, f.size, f.mime_type, f.is_dir
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.share_token = ?
  `).get(token);

  if (!share) {
    return res.status(404).json({ error: 'Shared link not found.' });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired.' });
  }

  if (share.allow_download !== 1) {
    return res.status(403).json({ error: 'Downloading is disabled by the file owner.' });
  }

  if (share.password_hash) {
    if (!password || !bcrypt.compareSync(password, share.password_hash)) {
      return res.status(401).json({ error: 'Password required or incorrect.' });
    }
  }

  if (!fs.existsSync(share.disk_path)) {
    return res.status(404).json({ error: 'File missing on storage server.' });
  }

  if (share.is_dir) {
    const archive = archiver('zip', { zlib: { level: 6 } });
    res.attachment(`${share.file_name}.zip`);
    archive.pipe(res);
    archive.directory(share.disk_path, share.file_name);
    archive.finalize();
  } else {
    res.download(share.disk_path, share.file_name);
  }
});

// GET /public/share/:token/stream - Stream/Preview shared media/file
router.get('/:token/stream', (req, res) => {
  const { token } = req.params;
  const { password } = req.query;

  const share = db.prepare(`
    SELECT s.*, f.name as file_name, f.disk_path, f.size, f.mime_type, f.is_dir
    FROM shares s
    JOIN files f ON s.file_id = f.id
    WHERE s.share_token = ?
  `).get(token);

  if (!share || share.is_dir) {
    return res.status(404).json({ error: 'Streamable file not found.' });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Link expired.' });
  }

  if (share.password_hash) {
    if (!password || !bcrypt.compareSync(password, share.password_hash)) {
      return res.status(401).json({ error: 'Password required.' });
    }
  }

  if (!fs.existsSync(share.disk_path)) {
    return res.status(404).json({ error: 'File missing on storage server.' });
  }

  const stat = fs.statSync(share.disk_path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(share.disk_path, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': share.mime_type || 'application/octet-stream',
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': share.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(share.file_name)}"`
    });
    fs.createReadStream(share.disk_path).pipe(res);
  }
});

module.exports = router;
