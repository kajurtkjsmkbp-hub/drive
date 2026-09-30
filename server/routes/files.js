const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const archiver = require('archiver');
const db = require('../db');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

function createZipArchiver(options = { zlib: { level: 6 } }) {
  if (typeof archiver === 'function') {
    return archiver('zip', options);
  }
  if (archiver.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  if (archiver.Archiver) {
    return new archiver.Archiver('zip', options);
  }
  throw new Error('Unsupported archiver format');
}

const STORAGE_ROOT = path.join(__dirname, '..', '..', 'data', 'storage');
const USERS_ROOT = path.join(STORAGE_ROOT, 'users');
const CHUNKS_ROOT = path.join(STORAGE_ROOT, 'chunks');

// Ensure directories exist
[STORAGE_ROOT, USERS_ROOT, CHUNKS_ROOT].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer memory/disk storage for standard uploads
const upload = multer({
  dest: path.join(STORAGE_ROOT, 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max per single-chunk upload
});

// Helper: Get user's root storage directory on physical disk
function getUserDiskRoot(username) {
  const userPath = path.join(USERS_ROOT, username);
  if (!fs.existsSync(userPath)) {
    fs.mkdirSync(userPath, { recursive: true });
  }
  return userPath;
}

// GET /api/files - List files/folders
router.get('/', authenticateToken, (req, res) => {
  const { parent = '/', filter, search, type } = req.query;
  const userId = req.user.id;

  try {
    let query = 'SELECT * FROM files WHERE user_id = ?';
    const params = [userId];

    if (filter === 'trash') {
      query += ' AND is_trashed = 1';
    } else {
      query += ' AND is_trashed = 0';

      if (filter === 'starred') {
        query += ' AND is_starred = 1';
      } else if (filter === 'recent') {
        query += ' AND is_dir = 0';
      } else if (search) {
        query += ' AND name LIKE ?';
        params.push(`%${search}%`);
      } else if (type) {
        // When category filter (Video, Gambar, Dokumen, dll) is active:
        // If at root '/', search across all folders in drive like Google Drive!
        // If inside a folder, search within that folder and all its subfolders!
        if (parent === '/') {
          query += ' AND is_dir = 0';
        } else {
          query += ' AND is_dir = 0 AND (parent_path = ? OR parent_path LIKE ?)';
          params.push(parent, `${parent}/%`);
        }
      } else {
        // Standard directory view
        query += ' AND parent_path = ?';
        params.push(parent);
      }
    }

    if (type && !filter) {
      if (type === 'image') {
        query += " AND (mime_type LIKE 'image/%' OR name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' OR name LIKE '%.gif' OR name LIKE '%.webp' OR name LIKE '%.svg' OR name LIKE '%.bmp')";
      } else if (type === 'video') {
        query += " AND (mime_type LIKE 'video/%' OR name LIKE '%.mp4' OR name LIKE '%.mkv' OR name LIKE '%.avi' OR name LIKE '%.mov' OR name LIKE '%.webm' OR name LIKE '%.wmv')";
      } else if (type === 'audio') {
        query += " AND (mime_type LIKE 'audio/%' OR name LIKE '%.mp3' OR name LIKE '%.wav' OR name LIKE '%.flac' OR name LIKE '%.ogg' OR name LIKE '%.m4a' OR name LIKE '%.aac')";
      } else if (type === 'document') {
        query += " AND (mime_type LIKE '%pdf%' OR mime_type LIKE '%text%' OR mime_type LIKE '%document%' OR mime_type LIKE '%sheet%' OR mime_type LIKE '%presentation%' OR name LIKE '%.pdf' OR name LIKE '%.doc' OR name LIKE '%.docx' OR name LIKE '%.xls' OR name LIKE '%.xlsx' OR name LIKE '%.ppt' OR name LIKE '%.pptx' OR name LIKE '%.txt' OR name LIKE '%.md' OR name LIKE '%.csv' OR name LIKE '%.odt' OR name LIKE '%.ods')";
      } else if (type === 'archive') {
        query += " AND (mime_type LIKE '%zip%' OR mime_type LIKE '%tar%' OR mime_type LIKE '%compressed%' OR name LIKE '%.zip' OR name LIKE '%.rar' OR name LIKE '%.7z' OR name LIKE '%.tar' OR name LIKE '%.gz' OR name LIKE '%.iso')";
      }
    }

    // Append ORDER BY at the very end
    if (filter === 'trash') {
      query += ' ORDER BY trashed_at DESC';
    } else if (filter === 'recent') {
      query += ' ORDER BY updated_at DESC LIMIT 50';
    } else {
      query += ' ORDER BY is_dir DESC, name ASC';
    }

    const files = db.prepare(query).all(...params);

    // Get current user usage and quota
    const userStmt = db.prepare('SELECT quota_bytes, used_bytes FROM users WHERE id = ?');
    const user = userStmt.get(userId);

    res.json({
      parent,
      files,
      storage: {
        used: user.used_bytes,
        quota: user.quota_bytes,
        percent: user.quota_bytes > 0 ? Math.min(100, Math.round((user.used_bytes / user.quota_bytes) * 100)) : 0
      }
    });
  } catch (err) {
    console.error('[Get Files Error]', err);
    res.status(500).json({ error: 'Failed to retrieve files.' });
  }
});

// POST /api/files/folder - Create Folder
router.post('/folder', authenticateToken, (req, res) => {
  const { name, parent_path = '/' } = req.body;
  if (!name || name.trim() === '' || name.includes('/') || name.includes('\\')) {
    return res.status(400).json({ error: 'Invalid folder name.' });
  }

  const cleanName = name.trim();
  const folderPath = parent_path === '/' ? `/${cleanName}` : `${parent_path}/${cleanName}`;
  const userRoot = getUserDiskRoot(req.user.username);
  const diskPath = path.join(userRoot, folderPath.replace(/\//g, path.sep));

  try {
    // Check if folder or file already exists in DB
    const existing = db.prepare('SELECT id FROM files WHERE user_id = ? AND parent_path = ? AND name = ? AND is_trashed = 0')
      .get(req.user.id, parent_path, cleanName);

    if (existing) {
      return res.status(409).json({ error: 'A file or folder with this name already exists in this location.' });
    }

    // Create directory on disk
    if (!fs.existsSync(diskPath)) {
      fs.mkdirSync(diskPath, { recursive: true });
    }

    const stmt = db.prepare(`
      INSERT INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
      VALUES (?, ?, ?, ?, ?, 0, 'directory', 1)
    `);
    const result = stmt.run(req.user.id, cleanName, parent_path, folderPath, diskPath);

    logActivity(req.user.id, req.user.username, 'CREATE_FOLDER', `Created folder ${folderPath}`, req);

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: Number(result.lastInsertRowid),
        name: cleanName,
        parent_path,
        path: folderPath,
        is_dir: 1,
        size: 0,
        mime_type: 'directory'
      }
    });
  } catch (err) {
    console.error('[Create Folder Error]', err);
    res.status(500).json({ error: 'Failed to create folder.' });
  }
});

// POST /api/files/upload - Standard Upload
router.post('/upload', authenticateToken, upload.array('files'), (req, res) => {
  const parent_path = req.body.parent_path || '/';
  const userRoot = getUserDiskRoot(req.user.username);

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided.' });
  }

  // Calculate total incoming size
  const totalUploadSize = req.files.reduce((acc, f) => acc + f.size, 0);

  // Check quota
  const user = db.prepare('SELECT quota_bytes, used_bytes FROM users WHERE id = ?').get(req.user.id);
  if (user.used_bytes + totalUploadSize > user.quota_bytes) {
    // Delete temp files
    req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    return res.status(413).json({ error: 'Storage quota exceeded. Cannot upload files.' });
  }

  const uploadedRecords = [];

  try {
    for (const file of req.files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const filePath = parent_path === '/' ? `/${originalName}` : `${parent_path}/${originalName}`;
      
      // Determine physical target
      const relativeDirPath = parent_path === '/' ? '' : parent_path.slice(1).replace(/\//g, path.sep);
      const targetDir = path.join(userRoot, relativeDirPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetDiskPath = path.join(targetDir, originalName);

      // Move from temp to target
      fs.copyFileSync(file.path, targetDiskPath);
      fs.unlinkSync(file.path);

      const mimeType = mime.lookup(originalName) || 'application/octet-stream';

      // Check if file record already exists in DB
      const existing = db.prepare('SELECT id, size FROM files WHERE user_id = ? AND parent_path = ? AND name = ? AND is_trashed = 0')
        .get(req.user.id, parent_path, originalName);

      let fileId;
      if (existing) {
        // Update existing record
        db.prepare(`
          UPDATE files SET size = ?, mime_type = ?, disk_path = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(file.size, mimeType, targetDiskPath, existing.id);
        fileId = existing.id;
      } else {
        const stmt = db.prepare(`
          INSERT INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `);
        const result = stmt.run(req.user.id, originalName, parent_path, filePath, targetDiskPath, file.size, mimeType);
        fileId = Number(result.lastInsertRowid);
      }

      uploadedRecords.push({ id: fileId, name: originalName, size: file.size, path: filePath });
    }

    // Recalculate used storage
    const newUsage = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(req.user.id).total;
    db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(newUsage, req.user.id);

    logActivity(req.user.id, req.user.username, 'UPLOAD_FILES', `Uploaded ${uploadedRecords.length} file(s)`, req);

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedRecords,
      total_used: newUsage
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// CHUNKED UPLOAD APIS (Crucial for Cloudflare Tunnel 100MB limit & Large Files)
// POST /api/files/chunk/init
router.post('/chunk/init', authenticateToken, (req, res) => {
  const { fileName, fileSize, totalChunks, parent_path = '/' } = req.body;

  if (!fileName || !fileSize) {
    return res.status(400).json({ error: 'Missing fileName or fileSize.' });
  }

  // Quota check
  const user = db.prepare('SELECT quota_bytes, used_bytes FROM users WHERE id = ?').get(req.user.id);
  if (user.used_bytes + fileSize > user.quota_bytes) {
    return res.status(413).json({ error: 'Storage quota exceeded. Please upgrade or delete files.' });
  }

  // Generate unique upload session ID
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const uploadSessionDir = path.join(CHUNKS_ROOT, uploadId);
  fs.mkdirSync(uploadSessionDir, { recursive: true });

  // Store metadata
  fs.writeFileSync(
    path.join(uploadSessionDir, 'meta.json'),
    JSON.stringify({
      uploadId,
      userId: req.user.id,
      username: req.user.username,
      fileName,
      fileSize,
      totalChunks,
      parent_path,
      createdAt: Date.now()
    })
  );

  res.json({ uploadId, message: 'Upload session initialized.' });
});

// POST /api/files/chunk/upload
router.post('/chunk/upload', authenticateToken, upload.single('chunk'), (req, res) => {
  const { uploadId, chunkIndex } = req.body;

  if (!uploadId || chunkIndex === undefined || !req.file) {
    return res.status(400).json({ error: 'Missing uploadId, chunkIndex, or chunk file.' });
  }

  const uploadSessionDir = path.join(CHUNKS_ROOT, uploadId);
  if (!fs.existsSync(uploadSessionDir)) {
    return res.status(404).json({ error: 'Upload session expired or not found.' });
  }

  const chunkTarget = path.join(uploadSessionDir, `chunk_${chunkIndex}`);
  fs.copyFileSync(req.file.path, chunkTarget);
  fs.unlinkSync(req.file.path);

  res.json({ success: true, chunkIndex: Number(chunkIndex) });
});

// POST /api/files/chunk/finish
router.post('/chunk/finish', authenticateToken, (req, res) => {
  const { uploadId } = req.body;
  const uploadSessionDir = path.join(CHUNKS_ROOT, uploadId);

  if (!fs.existsSync(uploadSessionDir)) {
    return res.status(404).json({ error: 'Upload session not found.' });
  }

  const metaPath = path.join(uploadSessionDir, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(400).json({ error: 'Session metadata missing.' });
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const userRoot = getUserDiskRoot(meta.username);

  const relativeDirPath = meta.parent_path === '/' ? '' : meta.parent_path.slice(1).replace(/\//g, path.sep);
  const targetDir = path.join(userRoot, relativeDirPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetDiskPath = path.join(targetDir, meta.fileName);
  const writeStream = fs.createWriteStream(targetDiskPath);

  try {
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = path.join(uploadSessionDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i}`);
      }
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
    }
    writeStream.end();

    // Clean up temporary chunk files
    fs.rmSync(uploadSessionDir, { recursive: true, force: true });

    const mimeType = mime.lookup(meta.fileName) || 'application/octet-stream';
    const filePath = meta.parent_path === '/' ? `/${meta.fileName}` : `${meta.parent_path}/${meta.fileName}`;

    // Update database
    const existing = db.prepare('SELECT id FROM files WHERE user_id = ? AND parent_path = ? AND name = ? AND is_trashed = 0')
      .get(meta.userId, meta.parent_path, meta.fileName);

    let fileId;
    if (existing) {
      db.prepare(`
        UPDATE files SET size = ?, mime_type = ?, disk_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(meta.fileSize, mimeType, targetDiskPath, existing.id);
      fileId = existing.id;
    } else {
      const stmt = db.prepare(`
        INSERT INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `);
      const result = stmt.run(meta.userId, meta.fileName, meta.parent_path, filePath, targetDiskPath, meta.fileSize, mimeType);
      fileId = Number(result.lastInsertRowid);
    }

    // Update user usage
    const newUsage = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(meta.userId).total;
    db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(newUsage, meta.userId);

    logActivity(meta.userId, meta.username, 'CHUNK_UPLOAD', `Completed large file upload: ${meta.fileName} (${(meta.fileSize / (1024*1024)).toFixed(2)} MB)`, req);

    res.json({
      message: 'Chunked upload complete',
      file: { id: fileId, name: meta.fileName, size: meta.fileSize, path: filePath }
    });
  } catch (err) {
    console.error('[Chunk Assembly Error]', err);
    res.status(500).json({ error: 'Failed to assemble file chunks: ' + err.message });
  }
});

// GET /api/files/download/:id - Download or Stream file
router.get('/download/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);

  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  if (file.is_dir) {
    return res.status(400).json({ error: 'Cannot directly download directory via single file stream. Use batch zip.' });
  }

  if (!fs.existsSync(file.disk_path)) {
    return res.status(404).json({ error: 'Physical file missing on server disk.' });
  }

  const stat = fs.statSync(file.disk_path);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  // HTTP Range request for smooth Video/Audio seeking (RFC 7233 compliant)
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    let start;
    let end;

    if (match[1] === '') {
      // Suffix range: bytes=-N (last N bytes of file, commonly used to read MP4 moov atom)
      const suffix = parseInt(match[2], 10);
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else if (match[2] === '') {
      // Open-ended range: bytes=N- (from N to end of file)
      start = parseInt(match[1], 10);
      end = fileSize - 1;
    } else {
      // Explicit range: bytes=N-M
      start = parseInt(match[1], 10);
      end = Math.min(parseInt(match[2], 10), fileSize - 1);
    }

    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = (end - start) + 1;
    const stream = fs.createReadStream(file.disk_path, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.mime_type || 'video/mp4',
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': file.mime_type || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': req.query.view === 'inline' ? 'inline' : `attachment; filename="${encodeURIComponent(file.name)}"`,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file.disk_path).pipe(res);
  }
});

// POST /api/files/download-batch - Download multiple files/folders as ZIP
router.post('/download-batch', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No files specified.' });
  }

  const files = db.prepare(`SELECT * FROM files WHERE id IN (${ids.map(() => '?').join(',')}) AND user_id = ?`)
    .all(...ids, req.user.id);

  if (files.length === 0) {
    return res.status(404).json({ error: 'Files not found.' });
  }

  const archive = createZipArchiver({ zlib: { level: 6 } });
  const zipName = files.length === 1 ? `${files[0].name}.zip` : `AetherDrive_Archive_${Date.now()}.zip`;

  res.attachment(zipName);
  archive.pipe(res);

  for (const item of files) {
    if (item.is_dir) {
      if (fs.existsSync(item.disk_path)) {
        archive.directory(item.disk_path, item.name);
      }
    } else {
      if (fs.existsSync(item.disk_path)) {
        archive.file(item.disk_path, { name: item.name });
      }
    }
  }

  archive.finalize();
});

// PUT /api/files/rename/:id - Rename
router.put('/rename/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const { newName } = req.body;

  if (!newName || newName.trim() === '' || newName.includes('/') || newName.includes('\\')) {
    return res.status(400).json({ error: 'Invalid file or folder name.' });
  }

  const cleanName = newName.trim();
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);

  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const newPath = file.parent_path === '/' ? `/${cleanName}` : `${file.parent_path}/${cleanName}`;
  const dirName = path.dirname(file.disk_path);
  const newDiskPath = path.join(dirName, cleanName);

  try {
    if (fs.existsSync(file.disk_path)) {
      fs.renameSync(file.disk_path, newDiskPath);
    }

    const newMime = file.is_dir ? 'directory' : (mime.lookup(cleanName) || 'application/octet-stream');

    db.prepare(`
      UPDATE files SET name = ?, path = ?, disk_path = ?, mime_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanName, newPath, newDiskPath, newMime, fileId);

    // If directory, update all child paths
    if (file.is_dir) {
      const children = db.prepare('SELECT * FROM files WHERE user_id = ? AND path LIKE ?').all(req.user.id, `${file.path}/%`);
      for (const child of children) {
        const updatedChildPath = child.path.replace(file.path, newPath);
        const updatedChildParent = child.parent_path.replace(file.path, newPath);
        const updatedChildDisk = child.disk_path.replace(file.disk_path, newDiskPath);
        db.prepare('UPDATE files SET path = ?, parent_path = ?, disk_path = ? WHERE id = ?')
          .run(updatedChildPath, updatedChildParent, updatedChildDisk, child.id);
      }
    }

    logActivity(req.user.id, req.user.username, 'RENAME', `Renamed ${file.name} to ${cleanName}`, req);

    res.json({ message: 'Renamed successfully', file: { id: fileId, name: cleanName, path: newPath } });
  } catch (err) {
    console.error('[Rename Error]', err);
    res.status(500).json({ error: 'Failed to rename item.' });
  }
});

// GET /api/files/folders - List all non-trashed folders for folder picker / moving
router.get('/folders', authenticateToken, (req, res) => {
  try {
    const folders = db.prepare('SELECT id, name, parent_path, path FROM files WHERE user_id = ? AND is_dir = 1 AND is_trashed = 0 ORDER BY path ASC').all(req.user.id);
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil daftar folder: ' + err.message });
  }
});

// POST /api/files/move - Move file(s) or folder(s) to target folder
router.post('/move', authenticateToken, (req, res) => {
  const { ids, target_parent_path = '/' } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Tidak ada berkas yang dipilih untuk dipindahkan.' });
  }

  const userRoot = getUserDiskRoot(req.user.username);
  
  // Verify target parent path exists (either '/' or a valid non-trashed folder)
  let targetDiskDir = userRoot;
  if (target_parent_path !== '/') {
    const targetFolder = db.prepare('SELECT * FROM files WHERE user_id = ? AND path = ? AND is_dir = 1 AND is_trashed = 0')
      .get(req.user.id, target_parent_path);
    if (!targetFolder) {
      return res.status(404).json({ error: 'Folder tujuan tidak ditemukan.' });
    }
    targetDiskDir = targetFolder.disk_path;
  }

  if (!fs.existsSync(targetDiskDir)) {
    fs.mkdirSync(targetDiskDir, { recursive: true });
  }

  const movedItems = [];
  const errors = [];

  for (const fileId of ids) {
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_trashed = 0').get(fileId, req.user.id);
    if (!file) {
      errors.push(`Berkas ID ${fileId} tidak ditemukan.`);
      continue;
    }

    // Cannot move to the exact same parent
    if (file.parent_path === target_parent_path) {
      continue;
    }

    // Cannot move a folder into itself or any of its subfolders
    if (file.is_dir && (target_parent_path === file.path || target_parent_path.startsWith(file.path + '/'))) {
      errors.push(`Tidak dapat memindahkan folder "${file.name}" ke dalam dirinya sendiri atau subfoldernya.`);
      continue;
    }

    const newPath = target_parent_path === '/' ? `/${file.name}` : `${target_parent_path}/${file.name}`;
    const newDiskPath = path.join(targetDiskDir, file.name);

    // Collision check in destination
    const existing = db.prepare('SELECT id FROM files WHERE user_id = ? AND parent_path = ? AND name = ? AND is_trashed = 0 AND id != ?')
      .get(req.user.id, target_parent_path, file.name, file.id);
    if (existing) {
      errors.push(`Berkas atau folder dengan nama "${file.name}" sudah ada di folder tujuan.`);
      continue;
    }

    try {
      // Move on disk if source exists
      if (fs.existsSync(file.disk_path)) {
        fs.renameSync(file.disk_path, newDiskPath);
      }

      const oldPath = file.path;
      const oldDiskPath = file.disk_path;

      // Update file entry in database
      db.prepare(`
        UPDATE files 
        SET parent_path = ?, path = ?, disk_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(target_parent_path, newPath, newDiskPath, file.id);

      // If directory, recursively update all child records in database
      if (file.is_dir) {
        const children = db.prepare('SELECT * FROM files WHERE user_id = ? AND path LIKE ?').all(req.user.id, `${oldPath}/%`);
        for (const child of children) {
          const updatedChildPath = child.path.replace(oldPath, newPath);
          const updatedChildParent = child.parent_path.replace(oldPath, newPath);
          const updatedChildDisk = child.disk_path.replace(oldDiskPath, newDiskPath);
          db.prepare('UPDATE files SET path = ?, parent_path = ?, disk_path = ? WHERE id = ?')
            .run(updatedChildPath, updatedChildParent, updatedChildDisk, child.id);
        }
      }

      movedItems.push({ id: file.id, name: file.name, oldPath, newPath });
    } catch (moveErr) {
      console.error('[Move Error]', moveErr);
      errors.push(`Gagal memindahkan "${file.name}": ${moveErr.message}`);
    }
  }

  logActivity(req.user.id, req.user.username, 'MOVE', `Memindahkan ${movedItems.length} item ke ${target_parent_path}`, req);

  res.json({
    message: `Berhasil memindahkan ${movedItems.length} berkas/folder.`,
    moved: movedItems,
    errors: errors.length > 0 ? errors : undefined
  });
});

// POST /api/files/rescan - Rescan physical storage to sync external changes
router.post('/rescan', authenticateToken, (req, res) => {
  const userRoot = getUserDiskRoot(req.user.username);
  let addedCount = 0;
  let removedCount = 0;

  try {
    function scanDir(currentDir, currentParentPath) {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullDiskPath = path.join(currentDir, entry.name);
        const virtualPath = currentParentPath === '/' ? `/${entry.name}` : `${currentParentPath}/${entry.name}`;
        const isDir = entry.isDirectory() ? 1 : 0;

        let stat;
        try {
          stat = fs.statSync(fullDiskPath);
        } catch {
          continue;
        }

        const existing = db.prepare('SELECT id FROM files WHERE user_id = ? AND path = ? AND is_trashed = 0')
          .get(req.user.id, virtualPath);

        if (!existing) {
          const mimeType = isDir ? 'directory' : (mime.lookup(entry.name) || 'application/octet-stream');
          db.prepare(`
            INSERT INTO files (user_id, name, parent_path, path, disk_path, size, mime_type, is_dir)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(req.user.id, entry.name, currentParentPath, virtualPath, fullDiskPath, isDir ? 0 : stat.size, mimeType, isDir);
          addedCount++;
        }

        if (isDir) {
          scanDir(fullDiskPath, virtualPath);
        }
      }
    }

    scanDir(userRoot, '/');

    const allUserFiles = db.prepare('SELECT id, disk_path FROM files WHERE user_id = ? AND is_trashed = 0').all(req.user.id);
    for (const f of allUserFiles) {
      if (!fs.existsSync(f.disk_path)) {
        db.prepare('DELETE FROM files WHERE id = ?').run(f.id);
        removedCount++;
      }
    }

    const newUsage = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(req.user.id).total;
    db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(newUsage, req.user.id);

    logActivity(req.user.id, req.user.username, 'RESCAN', `Pindai ulang berkas: +${addedCount} baru, -${removedCount} sinkronisasi`, req);

    res.json({
      message: `Pemindaian selesai: ${addedCount} berkas baru ditemukan, ${removedCount} berkas disinkronkan.`,
      added: addedCount,
      removed: removedCount,
      total_used: newUsage
    });
  } catch (err) {
    console.error('[Rescan Error]', err);
    res.status(500).json({ error: 'Gagal memindai ulang berkas: ' + err.message });
  }
});

// POST /api/files/star/:id - Toggle Starred
router.post('/star/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const file = db.prepare('SELECT id, is_starred FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);

  if (!file) return res.status(404).json({ error: 'File not found.' });

  const newStatus = file.is_starred === 1 ? 0 : 1;
  db.prepare('UPDATE files SET is_starred = ? WHERE id = ?').run(newStatus, fileId);

  res.json({ id: fileId, is_starred: newStatus });
});

// DELETE /api/files/:id - Move to Trash
router.delete('/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);

  if (!file) return res.status(404).json({ error: 'File not found.' });

  db.prepare('UPDATE files SET is_trashed = 1, trashed_at = CURRENT_TIMESTAMP WHERE id = ?').run(fileId);

  // If directory, mark children as trashed
  if (file.is_dir) {
    db.prepare('UPDATE files SET is_trashed = 1, trashed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND path LIKE ?')
      .run(req.user.id, `${file.path}/%`);
  }

  logActivity(req.user.id, req.user.username, 'TRASH', `Moved ${file.name} to recycle bin`, req);

  res.json({ message: 'Moved to trash' });
});

// POST /api/files/restore/:id - Restore from Trash
router.post('/restore/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);

  if (!file) return res.status(404).json({ error: 'File not found.' });

  db.prepare('UPDATE files SET is_trashed = 0, trashed_at = NULL WHERE id = ?').run(fileId);

  if (file.is_dir) {
    db.prepare('UPDATE files SET is_trashed = 0, trashed_at = NULL WHERE user_id = ? AND path LIKE ?')
      .run(req.user.id, `${file.path}/%`);
  }

  logActivity(req.user.id, req.user.username, 'RESTORE', `Restored ${file.name} from recycle bin`, req);

  res.json({ message: 'File restored' });
});

// DELETE /api/files/permanent/:id - Permanent Delete
router.delete('/permanent/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(fileId, req.user.id);

  if (!file) return res.status(404).json({ error: 'File not found.' });

  try {
    if (fs.existsSync(file.disk_path)) {
      if (file.is_dir) {
        fs.rmSync(file.disk_path, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file.disk_path);
      }
    }

    db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
    if (file.is_dir) {
      db.prepare('DELETE FROM files WHERE user_id = ? AND path LIKE ?').run(req.user.id, `${file.path}/%`);
    }

    // Update quota
    const newUsage = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(req.user.id).total;
    db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(newUsage, req.user.id);

    logActivity(req.user.id, req.user.username, 'PERMANENT_DELETE', `Permanently deleted ${file.name}`, req);

    res.json({ message: 'Permanently deleted', total_used: newUsage });
  } catch (err) {
    console.error('[Permanent Delete Error]', err);
    res.status(500).json({ error: 'Failed to delete permanently.' });
  }
});

// DELETE /api/files/trash/empty - Empty Trash
router.delete('/trash/empty', authenticateToken, (req, res) => {
  const trashedFiles = db.prepare('SELECT * FROM files WHERE user_id = ? AND is_trashed = 1').all(req.user.id);

  for (const file of trashedFiles) {
    if (fs.existsSync(file.disk_path)) {
      if (file.is_dir) {
        fs.rmSync(file.disk_path, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file.disk_path);
      }
    }
  }

  db.prepare('DELETE FROM files WHERE user_id = ? AND is_trashed = 1').run(req.user.id);

  // Update quota
  const newUsage = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(req.user.id).total;
  db.prepare('UPDATE users SET used_bytes = ? WHERE id = ?').run(newUsage, req.user.id);

  logActivity(req.user.id, req.user.username, 'EMPTY_TRASH', 'Emptied recycle bin', req);

  res.json({ message: 'Recycle bin emptied', total_used: newUsage });
});

module.exports = router;
